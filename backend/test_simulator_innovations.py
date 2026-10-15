import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("TESTING RIPPLE SIMULATOR FLAGSHIP INNOVATIONS")
    print("==================================================")

    # 1. Login as demo user
    login_resp = client.post("/api/auth/login", json={
        "email": "owner@rupiclothing.in",
        "password": "password123"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "x-business-id": "biz_1"}
    print("[OK] Logged in as demo owner.")

    # Reset any active rescues
    client.post("/api/simulator/rescues/revert-all", headers=headers)

    # 2. Test Simulation Execution with Fragility & True Margin
    sim_resp = client.post("/api/simulator/simulate", json={
        "supplierDeliveryDelayDays": 0,
        "customerPaymentDelayDays": 16, # Apex Corp delayed +16d to Day 31
        "horizonDays": 30
    }, headers=headers)
    assert sim_resp.status_code == 200, f"Simulate failed: {sim_resp.text}"
    sim_data = sim_resp.json()

    # Verify True Margin calculation
    tm = sim_data["trueMargin"]
    assert tm["paperMarginPaise"] == 12_500_000, f"Expected 12.5L paper margin, got {tm['paperMarginPaise']}"
    assert tm["paperMarginPercent"] == 25.0, f"Expected 25% paper margin, got {tm['paperMarginPercent']}"
    # 13 days of contagion: (31 - 18 = 13)
    # Lost discount ₹3,600 + Halt fees ₹32,500 + SLA ₹39,000 + Float ₹18,200 = ₹93,300 (9,330,000 paise)
    assert tm["totalContagionCostPaise"] == 9_330_000, f"Expected 9,330,000 contagion, got {tm['totalContagionCostPaise']}"
    assert tm["trueRippleMarginPaise"] == 3_170_000, f"Expected 3,170,000 true margin, got {tm['trueRippleMarginPaise']}"
    assert tm["trueRippleMarginPercent"] == 6.34, f"Expected 6.34% true margin, got {tm['trueRippleMarginPercent']}"
    print(f"[OK] True Margin verified: Paper {tm['paperMarginPercent']}% (INR 125,000) -> Contagion INR 93,300 -> True {tm['trueRippleMarginPercent']}% (INR 31,700)")

    # Verify Fragility Multiplier
    apex_node = next(n for n in sim_data["timelineNodes"] if n["id"] == "node_apex_corp")
    assert apex_node["fragility"]["multiplier"] == 20.0, f"Expected 20.0x fragility, got {apex_node['fragility']['multiplier']}"
    assert apex_node["fragility"]["isKeystone"] is True
    print(f"[OK] Fragility Multiplier verified: {apex_node['fragility']['badgeText']}")

    # 3. Test Chaos Stress-Test
    stress_resp = client.post("/api/simulator/chaos-test", json={
        "customerPaymentDelayDays": 16,
        "supplierDeliveryDelayDays": 0,
        "horizonDays": 30
    }, headers=headers)
    assert stress_resp.status_code == 200, f"Chaos test failed: {stress_resp.text}"
    stress_data = stress_resp.json()
    assert stress_data["isStressTestActive"] is True
    assert "stressedMinCashPaise" in stress_data
    assert stress_data["mostFragileMultiplier"] >= 20.0
    # Check that stressed timeline node has purple highlight metadata
    stressed_fragile = next(n for n in stress_data["stressedResult"]["timelineNodes"] if n.get("isMostFragileUnderStress"))
    assert stressed_fragile["stressHighlightColor"] == "#8b5cf6"
    assert stressed_fragile["stressBadge"] == "MOST FRAGILE UNDER STRESS"
    print(f"[OK] Chaos Stress-Test verified: Identified {stressed_fragile['label']} as {stressed_fragile['stressBadge']}")

    # 4. Test Auto-Phase Inventory Preview & Apply
    ap_preview_resp = client.post("/api/simulator/rescues/auto-phase/preview", json={
        "supplierCommitmentPaise": 12_000_000,
        "actualAvailableCashPaise": 15_000_000,
        "originalPaymentDate": "Day 18",
        "customerPaymentDate": "Day 31",
    }, headers=headers)
    assert ap_preview_resp.status_code == 200
    ap_preview = ap_preview_resp.json()
    assert ap_preview["batch1"]["amountPaise"] == 10_000_000 # ₹1,00,000 on Day 18
    assert ap_preview["batch2"]["amountPaise"] == 2_000_000  # ₹20,000 on Day 32
    assert ap_preview["batch1"]["date"] == "Day 18"
    assert ap_preview["batch2"]["date"] == "Day 32"
    print("[OK] Auto-Phase Preview verified: Batch 1 INR 100,000 (Day 18) + Batch 2 INR 20,000 (Day 32)")

    ap_apply_resp = client.post("/api/simulator/rescues/auto-phase/apply", json={
        "supplierCommitmentPaise": 12_000_000,
        "actualAvailableCashPaise": 15_000_000,
        "originalPaymentDate": "Day 18",
        "customerPaymentDate": "Day 31",
    }, headers=headers)
    assert ap_apply_resp.status_code == 200
    ap_rescue_id = ap_apply_resp.json()["rescueId"]

    # Re-run simulation with Auto-Phase active
    sim_ap_resp = client.post("/api/simulator/simulate", json={
        "customerPaymentDelayDays": 16,
        "horizonDays": 30
    }, headers=headers)
    sim_ap_data = sim_ap_resp.json()
    assert sim_ap_data["isAutoPhaseApplied"] is True
    # Contagion cost eliminated
    assert sim_ap_data["trueMargin"]["totalContagionCostPaise"] == 0
    assert sim_ap_data["trueMargin"]["trueRippleMarginPercent"] == 25.0
    print("[OK] Auto-Phase Application verified: True Margin restored to 25.0% and Batch 2 scheduled.")

    # Revert Auto-Phase
    revert_resp = client.post(f"/api/simulator/rescues/{ap_rescue_id}/revert", headers=headers)
    assert revert_resp.status_code == 200
    print("[OK] Auto-Phase Reverted cleanly.")

    # 5. Test Zero-Cash Tri-Party Split-Escrow Preview & Apply
    esc_preview_resp = client.post("/api/simulator/rescues/split-escrow/preview", json={
        "customerInvoicePaise": 50_000_000,
        "supplierCommitmentPaise": 12_000_000,
    }, headers=headers)
    assert esc_preview_resp.status_code == 200
    esc_preview = esc_preview_resp.json()
    assert esc_preview["floatFeePaise"] == 240_000 # 2% = ₹2,400
    assert esc_preview["netProceedsPaise"] == 37_760_000 # ₹3,77,600
    print("[OK] Split-Escrow Preview verified: Float Fee INR 2,400, Net Proceeds INR 377,600")

    esc_apply_resp = client.post("/api/simulator/rescues/split-escrow/apply", json={
        "customerInvoicePaise": 50_000_000,
        "supplierCommitmentPaise": 12_000_000,
    }, headers=headers)
    assert esc_apply_resp.status_code == 200
    esc_rescue_id = esc_apply_resp.json()["rescueId"]

    # Re-run simulation with Split-Escrow active
    sim_esc_resp = client.post("/api/simulator/simulate", json={
        "customerPaymentDelayDays": 16,
        "horizonDays": 30
    }, headers=headers)
    sim_esc_data = sim_esc_resp.json()
    assert sim_esc_data["isSplitEscrowApplied"] is True
    # Check bypass arc on apex node
    apex_node_esc = next(n for n in sim_esc_data["timelineNodes"] if n["id"] == "node_apex_corp")
    assert apex_node_esc["hasBypassArc"] is True
    assert apex_node_esc["bypassTargetId"] == "node_kaveri_timber"
    # Check kaveri node amount is 0 ordinary outflow and marked released
    kaveri_node_esc = next(n for n in sim_esc_data["timelineNodes"] if n["id"] == "node_kaveri_timber")
    assert kaveri_node_esc["amountPaise"] == 0
    assert kaveri_node_esc["status"] == "released"
    # Check margin: only float fee deducted
    assert sim_esc_data["trueMargin"]["totalContagionCostPaise"] == 240_000
    assert sim_esc_data["trueMargin"]["trueRippleMarginPaise"] == 12_500_000 - 240_000
    print("[OK] Split-Escrow Application verified: Bypass Arc established, Day 18 Outflow = INR 0, True Margin protected.")

    # Revert Escrow
    revert_esc_resp = client.post(f"/api/simulator/rescues/{esc_rescue_id}/revert", headers=headers)
    assert revert_esc_resp.status_code == 200
    print("[OK] Split-Escrow Reverted cleanly.")

    # 6. Test Multi-Tenant Security on Rescues
    import uuid
    hack_email = f"hacker_{uuid.uuid4().hex[:6]}@otherbusiness.com"
    reg_resp = client.post("/api/auth/register", json={
        "email": hack_email,
        "password": "Password123!",
        "full_name": "Intruder User",
        "business_name": "Other Corp"
    })
    assert reg_resp.status_code == 200, f"Register failed: {reg_resp.text}"
    other_data = reg_resp.json()
    other_token = other_data["access_token"]
    other_biz = other_data["business"]["id"]
    other_headers = {"Authorization": f"Bearer {other_token}", "x-business-id": other_biz}

    # Intruder tries to revert demo owner's rescue
    fake_revert = client.post(f"/api/simulator/rescues/{esc_rescue_id}/revert", headers=other_headers)
    assert fake_revert.status_code == 404, f"Expected 404 for cross-tenant revert, got {fake_revert.status_code}"
    print("[OK] Cross-tenant rescue security strictly verified (404 Not Found on foreign rescue).")

    print("==================================================")
    print("ALL SIMULATOR INNOVATION BACKEND TESTS PASSED (100% GREEN)!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
