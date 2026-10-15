import uuid
from fastapi.testclient import TestClient
from app.main import app, on_startup

client = TestClient(app)

def test_registration_validation():
    on_startup()

    print("\n--- TEST 1: Reject Invalid Email ---")
    resp = client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "validPassword123",
        "full_name": "Test User",
        "business_name": "Test Biz",
    })
    assert resp.status_code == 422, f"Expected 422 for invalid email, got {resp.status_code}"
    print("[PASS] Invalid email rejected with 422 Unprocessable Entity!")

    print("\n--- TEST 2: Reject Weak/Short Password ---")
    resp = client.post("/api/auth/register", json={
        "email": f"valid_{uuid.uuid4().hex[:6]}@example.com",
        "password": "short", # < 8 chars
        "full_name": "Test User",
        "business_name": "Test Biz",
    })
    assert resp.status_code == 422, f"Expected 422 for short password, got {resp.status_code}"
    print("[PASS] Weak/short password (<8 chars) rejected with 422 Unprocessable Entity!")

    print("\n--- TEST 3: Reject Raw Script Injection in Name ---")
    resp = client.post("/api/auth/register", json={
        "email": f"valid_{uuid.uuid4().hex[:6]}@example.com",
        "password": "validPassword123",
        "full_name": "<script>alert(1)</script>", # Strips to empty string
        "business_name": "Test Biz",
    })
    assert resp.status_code == 422, f"Expected 422 for script injection, got {resp.status_code}"
    print("[PASS] Raw script injection in full_name rejected with 422!")

    print("\n--- TEST 4: Sanitize Business Name & Succeed on Valid Registration ---")
    email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "ValidPassword123",
        "full_name": "Clean User <script>evil()</script>",
        "business_name": "Clean Biz <script>alert('xss')</script>",
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["user"]["full_name"] == "Clean User"
    assert data["business"]["name"] == "Clean Biz"
    print(f"[PASS] Registered user successfully sanitized: user='{data['user']['full_name']}', biz='{data['business']['name']}'")

    print("\n========================================================")
    print("ALL REGISTRATION VALIDATION & SANITIZATION TESTS PASSED!")
    print("========================================================\n")

if __name__ == "__main__":
    test_registration_validation()
