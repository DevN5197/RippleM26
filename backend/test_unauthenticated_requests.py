from fastapi.testclient import TestClient
from app.main import app, on_startup

client = TestClient(app)

def test_unauthenticated_endpoints():
    on_startup()

    print("\n--- TEST 1: Protected Endpoint Without Authorization Header ---")
    resp = client.get("/api/suppliers")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    assert "WWW-Authenticate" in resp.headers
    print("[PASS] Missing token returns clean 401 Unauthorized!")

    print("\n--- TEST 2: Dashboard Endpoint Without Authorization Header ---")
    resp = client.get("/api/dashboard/summary")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    print("[PASS] Dashboard missing token returns clean 401 Unauthorized!")

    print("\n--- TEST 3: Invalid/Malformed Bearer Token ---")
    resp = client.get("/api/suppliers", headers={"Authorization": "Bearer malformed.garbage.token"})
    assert resp.status_code == 401, f"Expected 401 for malformed token, got {resp.status_code}: {resp.text}"
    assert resp.status_code != 500, "Must NEVER return 500 Internal Server Error"
    print("[PASS] Malformed token returns clean 401 Unauthorized (No 500)!")

    print("\n--- TEST 4: Non-JWT Gibberish Token ---")
    resp = client.get("/api/invoices", headers={"Authorization": "Bearer not-even-jwt"})
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
    assert resp.status_code != 500, "Must NEVER return 500 Internal Server Error"
    print("[PASS] Gibberish token returns clean 401 Unauthorized (No 500)!")

    print("\n--- TEST 5: Legitimate Authenticated Request ---")
    login_resp = client.post("/api/auth/login", json={
        "email": "owner@rupiclothing.in",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    valid_resp = client.get("/api/suppliers", headers={
        "Authorization": f"Bearer {token}",
        "x-business-id": "biz_1"
    })
    assert valid_resp.status_code == 200, f"Expected 200, got {valid_resp.status_code}"
    print("[PASS] Valid authentication continues to succeed with 200 OK!")

    print("\n========================================================")
    print("ALL UNAUTHENTICATED 401 TEST VERIFICATIONS PASSED 100%!")
    print("========================================================\n")

if __name__ == "__main__":
    test_unauthenticated_endpoints()
