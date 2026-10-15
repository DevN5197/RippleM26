from fastapi.testclient import TestClient
from app.main import app, on_startup

client = TestClient(app)

def test_safety_threshold_validation():
    on_startup()

    # 1. Login
    login_resp = client.post("/api/auth/login", json={
        "email": "owner@rupiclothing.in",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "x-business-id": "biz_1"}

    print("\n--- TEST 1: Reject Negative Safety Threshold ---")
    neg_resp = client.patch("/api/business/safety-threshold", json={
        "safetyThresholdPaise": -500000
    }, headers=headers)
    assert neg_resp.status_code == 400, f"Expected 400, got {neg_resp.status_code}"
    print("[PASS] Negative safety threshold rejected!")

    print("\n--- TEST 2: Reject Unbounded Safety Threshold (> 10 Billion Paise) ---")
    huge_resp = client.patch("/api/business/safety-threshold", json={
        "safetyThresholdPaise": 999_999_999_999_999
    }, headers=headers)
    assert huge_resp.status_code == 400, f"Expected 400, got {huge_resp.status_code}"
    assert "working-capital limit" in huge_resp.json().get("detail", "").lower()
    print("[PASS] Unbounded safety threshold (> 10 Billion Paise) strictly rejected with 400!")

    print("\n--- TEST 3: Reject Unbounded via /api/settings ---")
    settings_resp = client.patch("/api/settings", json={
        "business": {"safetyThresholdPaise": 50_000_000_000}
    }, headers=headers)
    assert settings_resp.status_code == 400, f"Expected 400, got {settings_resp.status_code}"
    print("[PASS] Unbounded safety threshold via /api/settings rejected with 400!")

    print("\n--- TEST 4: Accept Valid Working-Capital Safety Threshold ---")
    valid_resp = client.patch("/api/business/safety-threshold", json={
        "safetyThresholdPaise": 750000
    }, headers=headers)
    assert valid_resp.status_code == 200, f"Expected 200, got {valid_resp.status_code}"
    assert valid_resp.json()["safetyThresholdPaise"] == 750000
    print("[PASS] Valid safety threshold accepted cleanly!")

    print("\n========================================================")
    print("ALL SAFETY THRESHOLD UPPER-BOUND TESTS PASSED 100%!")
    print("========================================================\n")

if __name__ == "__main__":
    test_safety_threshold_validation()
