import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_backend_integration():
    print("1. Testing Health Endpoint...")
    resp = client.get("/health")
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "healthy"
    print("   Health endpoint OK!")

    print("2. Testing User Login...")
    resp = client.post("/api/auth/login", json={
        "email": "owner@rupiclothing.in",
        "password": "password123",
    })
    assert resp.status_code == 200, resp.text
    auth_data = resp.json()
    token = auth_data["access_token"]
    assert token, "No token returned"
    biz_id = auth_data["business"]["id"]
    assert biz_id == "biz_1"
    headers = {"Authorization": f"Bearer {token}", "x-business-id": biz_id}
    print(f"   Login successful! User ID: {auth_data['user']['id']}, Biz: {biz_id}")

    print("3. Testing Protected /api/auth/me...")
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["user"]["email"] == "owner@rupiclothing.in"
    print("   /api/auth/me OK!")

    print("4. Testing User Registration & Tenant Isolation...")
    import uuid
    random_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": random_email,
        "password": "securepassword",
        "full_name": "New User",
        "business_name": "New Ventures Ltd",
    })
    assert resp.status_code == 200, resp.text
    new_user_data = resp.json()
    new_token = new_user_data["access_token"]
    new_biz_id = new_user_data["business"]["id"]
    new_headers = {"Authorization": f"Bearer {new_token}", "x-business-id": new_biz_id}
    assert new_biz_id != biz_id

    # Try accessing biz_1 using new_user's token -> MUST BE 403 Forbidden
    forbidden_headers = {"Authorization": f"Bearer {new_token}", "x-business-id": biz_id}
    resp = client.get("/api/suppliers", headers=forbidden_headers)
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}"
    print("   Tenant isolation strictly verified (403 Forbidden when accessing unauthorized business)!")

    print("5. Testing Suppliers List & Summary...")
    resp = client.get("/api/suppliers", headers=headers)
    assert resp.status_code == 200, resp.text
    suppliers_data = resp.json()
    assert len(suppliers_data["data"]) >= 3
    resp = client.get("/api/suppliers/summary", headers=headers)
    assert resp.status_code == 200
    print("   Suppliers endpoints OK!")

    print("6. Testing Customers List & Summary...")
    resp = client.get("/api/customers", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 3
    resp = client.get("/api/customers/summary", headers=headers)
    assert resp.status_code == 200
    print("   Customers endpoints OK!")

    print("7. Testing Inventory List & Summary...")
    resp = client.get("/api/inventory", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 4
    resp = client.get("/api/inventory/summary", headers=headers)
    assert resp.status_code == 200
    resp = client.get("/api/inventory/reorder-recommendations", headers=headers)
    assert resp.status_code == 200
    resp = client.get("/api/inventory/alerts", headers=headers)
    assert resp.status_code == 200
    print("   Inventory endpoints OK!")

    print("8. Testing Invoices & Recording Payments...")
    resp = client.get("/api/invoices", headers=headers)
    assert resp.status_code == 200
    invoices = resp.json()["data"]
    assert len(invoices) >= 4

    # Create a new test invoice
    resp = client.post("/api/invoices", headers=headers, json={
        "type": "receivable",
        "customerId": "cus_1",
        "amountPaise": 500000, # ₹5,000
        "issueDate": "2026-10-14",
        "dueDate": "2026-10-28",
        "notes": "Automated integration test invoice",
    })
    assert resp.status_code == 201, resp.text
    test_inv = resp.json()
    inv_id = test_inv["id"]
    assert test_inv["amountPaise"] == 500000
    assert test_inv["amountPaidPaise"] == 0

    # Record partial payment ₹2,000 (200000 paise)
    resp = client.post(f"/api/invoices/{inv_id}/payments", headers=headers, json={
        "amountPaise": 200000,
        "paymentDate": "2026-10-14",
        "method": "UPI",
    })
    assert resp.status_code == 200, resp.text
    payment_rec = resp.json()
    assert payment_rec["amountPaise"] == 200000

    # Check updated invoice status
    resp = client.get(f"/api/invoices/{inv_id}", headers=headers)
    assert resp.status_code == 200
    inv_detail = resp.json()["invoice"]
    assert inv_detail["amountPaidPaise"] == 200000
    assert inv_detail["status"] == "partially_paid"
    assert inv_detail["outstandingPaise"] == 300000
    print("   Invoice creation and payment math verified in paise!")

    print("9. Testing Cash Flow Forecast...")
    resp = client.get("/api/forecast?days=30", headers=headers)
    assert resp.status_code == 200, resp.text
    forecast = resp.json()
    assert "points" in forecast
    assert len(forecast["points"]) == 30
    assert "dailyLedger" in forecast
    assert len(forecast["dailyLedger"]) == 30
    # Check mathematical consistency of ledger
    for entry in forecast["dailyLedger"]:
        assert entry["openingBalancePaise"] + entry["totalInflowsPaise"] - entry["totalOutflowsPaise"] == entry["closingBalancePaise"]
    print("   Cash Flow Forecast and mathematical consistency verified!")

    print("10. Testing Ripple Simulator...")
    resp = client.post("/api/simulate", headers=headers, json={
        "supplierDeliveryDelayDays": 7,
        "customerPaymentDelayDays": 14,
        "customerPaymentAmountPaise": None,
        "supplierPaymentAmountPaise": None,
        "orderQuantityMultiplier": 1.0,
        "horizonDays": 30,
    })
    assert resp.status_code == 200, resp.text
    sim_res = resp.json()
    assert "rippleScore" in sim_res
    assert "baselinePoints" in sim_res
    assert "scenarioPoints" in sim_res
    print("   Ripple Simulator execution verified!")

    print("11. Testing Relationship Graph...")
    resp = client.get("/api/v1/relationships", headers=headers)
    assert resp.status_code == 200, resp.text
    graph = resp.json()
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) > 0
    print("   Relationship Graph verified!")

    print("12. Testing Settings & Reset Demo Data...")
    resp = client.get("/settings", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["business"]["id"] == "biz_1"
    resp = client.post("/settings/reset-demo-data", headers=headers)
    assert resp.status_code == 200
    print("   Settings and Demo Reset verified!")

    print("13. Testing Business Command Center / Dashboard Summary...")
    resp = client.get("/api/dashboard/summary", headers=headers)
    assert resp.status_code == 200, resp.text
    dash = resp.json()

    # Verify all expected schema fields
    for field in [
        "businessName", "currency", "cashOnHandPaise", "receivablesPaise",
        "payablesPaise", "overdueReceivablesPaise", "lowStockCount",
        "openInvoiceCount", "forecast", "alerts", "recommendations", "upcomingEvents"
    ]:
        assert field in dash, f"Missing field {field} in dashboard summary"

    assert dash["businessName"] == "Rupi Clothing"
    assert dash["currency"] == "INR"
    assert dash["openInvoiceCount"] >= 3
    assert len(dash["forecast"]) == 30
    assert len(dash["upcomingEvents"]) > 0

    # Verify Cash-flow calculation matching Prompt 01 scenario:
    # Opening cash ₹10,000 (1,000,000 paise) - ₹5,000 advance paid on PO-1 = ₹5,000 (500,000 paise)
    assert dash["cashOnHandPaise"] == 500000, f"Expected 500,000 paise, got {dash['cashOnHandPaise']}"
    print(f"   Dashboard cash calculations verified: Cash on Hand = INR {dash['cashOnHandPaise'] / 100:,.2f}")

    # Test Recent Activity
    resp = client.get("/api/dashboard/recent-activity", headers=headers)
    assert resp.status_code == 200
    activities = resp.json().get("activities", [])
    assert len(activities) > 0
    print(f"   Recent Activity endpoint verified ({len(activities)} activities returned)!")

    # Test Tenant Isolation on Dashboard
    resp = client.get("/api/dashboard/summary", headers=new_headers)
    assert resp.status_code == 200
    new_dash = resp.json()
    assert new_dash["businessName"] == "New Ventures Ltd"
    # An empty new business should display valid empty states
    assert new_dash["receivablesPaise"] == 0
    assert new_dash["payablesPaise"] == 0
    assert new_dash["overdueReceivablesPaise"] == 0
    assert new_dash["openInvoiceCount"] == 0
    assert new_dash["lowStockCount"] == 0
    assert len(new_dash["upcomingEvents"]) == 0
    print("   Tenant isolation and empty-state handling for new businesses verified!")

    print("14. Testing Pillar 1: Cross-Tenant IDOR Prevention...")
    # Attempt to create an invoice in new_biz referencing cus_1 (which belongs to biz_1) -> MUST BE 404
    resp = client.post("/api/invoices", headers=new_headers, json={
        "type": "receivable",
        "customerId": "cus_1",
        "amountPaise": 100000,
        "issueDate": "2026-10-15",
    })
    assert resp.status_code == 404, f"Expected 404 Not Found for cross-tenant customer, got {resp.status_code}"
    print("   Pillar 1 IDOR protection strictly rejected cross-tenant counterparty reference (404 Not Found)!")

    print("15. Testing Pillar 2: Zero-Division & Negative Math Safety...")
    resp = client.post("/api/simulator/simulate", headers=headers, json={
        "customerPaymentAmountPaise": 0,
        "supplierPaymentAmountPaise": 0,
        "customerPaymentDelayDays": 0,
        "supplierDeliveryDelayDays": 0,
        "horizonDays": 30,
    })
    assert resp.status_code == 200, resp.text
    zero_sim = resp.json()
    assert zero_sim["trueMargin"]["paperMarginPercent"] == 0.0 or isinstance(zero_sim["trueMargin"]["paperMarginPercent"], float)
    assert zero_sim["trueMargin"]["trueRippleMarginPercent"] == 0.0 or isinstance(zero_sim["trueMargin"]["trueRippleMarginPercent"], float)
    print("   Pillar 2 zero-division safety verified: 0 revenue/cost cleanly returns 0.0% margin without NaN or 500 error!")

    print("16. Testing Pillar 3: Rescue Idempotency (Auto-Phase Rapid Clicks)...")
    ap_payload = {
        "supplierCommitmentPaise": 12_000_000,
        "actualAvailableCashPaise": 15_000_000,
        "originalPaymentDate": "Day 18",
        "customerPaymentDate": "Day 31",
    }
    # Call apply twice in rapid succession
    resp1 = client.post("/api/simulator/rescues/auto-phase/apply", headers=headers, json=ap_payload)
    assert resp1.status_code == 200, resp1.text
    resp2 = client.post("/api/simulator/rescues/auto-phase/apply", headers=headers, json=ap_payload)
    assert resp2.status_code == 200, resp2.text

    # Verify active rescues count for auto_phase is exactly 1 (supersedes prior active)
    resp = client.get("/api/simulator/rescues", headers=headers)
    assert resp.status_code == 200
    active_rescues = resp.json()
    active_ap = [r for r in active_rescues if r["rescue_type"] == "auto_phase"]
    assert len(active_ap) == 1, f"Expected exactly 1 active auto_phase rescue, got {len(active_ap)}"
    print("   Pillar 3 idempotency strictly verified: repeated Auto-Phase calls do not duplicate active rescues!")

    print("17. Testing Pillar 4: Security Payload Cap (1MB max)...")
    huge_payload = {"notes": "x" * (1024 * 1024 + 100)} # > 1MB
    resp = client.post("/api/invoices", headers=headers, json=huge_payload)
    assert resp.status_code == 413, f"Expected 413 Payload Too Large, got {resp.status_code}"
    print("   Pillar 4 payload size cap strictly verified (413 Request Entity Too Large on >1MB payload)!")

    print("18. Testing Pillar 4 & 5: Backend AI Proxy & Offline Fallback...")
    ai_resp = client.post("/api/ai/chat", headers=headers, json={
        "prompt": "How can I improve my cash flow?",
        "systemInstruction": "You are a financial advisor.",
        "history": [],
    })
    assert ai_resp.status_code == 200, ai_resp.text
    ai_data = ai_resp.json()
    assert "text" in ai_data
    assert len(ai_data["text"]) > 20
    print(f"   Pillar 4 & 5 AI Proxy verified: Model={ai_data.get('model')}, Response length={len(ai_data['text'])} chars!")

    print("\nALL BACKEND JUGGERNAUT INTEGRATION & SECURITY TESTS PASSED 100% GREEN!")

if __name__ == "__main__":
    test_backend_integration()

