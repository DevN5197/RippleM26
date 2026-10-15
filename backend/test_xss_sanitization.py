import sys
from fastapi.testclient import TestClient
from app.main import app, on_startup
from app.services.sanitization import sanitize_string, sanitize_payload

client = TestClient(app)

def test_xss_sanitization():
    on_startup()
    print("\n--- TEST 1: Unit Test String Sanitization ---")
    assert sanitize_string("<script>alert(1)</script>") == ""
    assert sanitize_string("Hello <script>alert('xss')</script>World") == "Hello World"
    assert sanitize_string("<img src=x onerror=alert(1)>") == ""
    assert sanitize_string("<a href=\"javascript:alert('xss')\">Safe Text</a>") == "Safe Text"
    assert sanitize_string("<iframe>some frame</iframe>Notes") == "Notes"
    assert sanitize_string("Normal Supplier & Co.") == "Normal Supplier & Co."
    print("[PASS] String sanitization strictly strips malicious tags and event handlers!")

    print("\n--- TEST 2: Supplier Creation & Update XSS Sanitization ---")
    login_resp = client.post("/api/auth/login", json={
        "email": "owner@rupiclothing.in",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "x-business-id": "biz_1"}

    # Create supplier with XSS injection in name and notes
    sup_resp = client.post("/api/suppliers", json={
        "name": "Malicious Supplier <script>alert('pwned')</script>",
        "notes": "Legit notes with <img src=x onerror=alert(document.cookie)> payload",
        "contactName": "Hacker <script>evil()</script>",
    }, headers=headers)
    assert sup_resp.status_code == 201, f"Failed: {sup_resp.text}"
    sup_data = sup_resp.json()
    assert "<script>" not in sup_data["name"]
    assert "alert('pwned')" not in sup_data["name"]
    assert sup_data["name"] == "Malicious Supplier"
    assert "<img" not in sup_data["notes"]
    assert "onerror=" not in sup_data["notes"]
    assert "<script>" not in sup_data["contactName"]
    assert sup_data["contactName"] == "Hacker"
    print(f"[PASS] Supplier created cleanly sanitized: name='{sup_data['name']}', contact='{sup_data['contactName']}', notes='{sup_data['notes']}'")

    print("\n--- TEST 3: Customer Creation XSS Sanitization ---")
    cust_resp = client.post("/api/customers", json={
        "name": "XSS Customer <script>alert(1)</script>",
        "notes": "<svg onload=alert(1)>Critical customer instructions",
    }, headers=headers)
    assert cust_resp.status_code == 201, f"Failed: {cust_resp.text}"
    cust_data = cust_resp.json()
    assert "<script>" not in cust_data["name"]
    assert cust_data["name"] == "XSS Customer"
    assert "<svg" not in cust_data["notes"]
    assert "onload=" not in cust_data["notes"]
    assert "Critical customer instructions" in cust_data["notes"]
    print(f"[PASS] Customer sanitized: name='{cust_data['name']}', notes='{cust_data['notes']}'")

    print("\n--- TEST 4: Security Headers (CSP & X-XSS-Protection) ---")
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert "Content-Security-Policy" in health_resp.headers, "CSP header missing"
    assert "X-XSS-Protection" in health_resp.headers, "X-XSS-Protection header missing"
    assert health_resp.headers["X-XSS-Protection"] == "1; mode=block"
    print(f"[PASS] Security headers verified: CSP='{health_resp.headers['Content-Security-Policy']}'")

    print("\n========================================================")
    print("ALL STORED XSS & INPUT SANITIZATION TESTS PASSED 100%!")
    print("========================================================\n")

if __name__ == "__main__":
    test_xss_sanitization()
