import sys
from fastapi.testclient import TestClient
from app.main import app, on_startup
from app.services.auth import login_rate_limiter

client = TestClient(app)

def test_auth_rate_limiting():
    # Ensure database is seeded and ready
    on_startup()
    login_rate_limiter.reset()

    print("\n--- TEST 1: User's Proof-of-Concept (15 Failed Login Attempts in a Loop) ---")
    status_codes = []
    for i in range(1, 16):
        resp = client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
            headers={"x-forwarded-for": "198.51.100.1"}
        )
        status_codes.append(resp.status_code)
        if resp.status_code == 429:
            assert "Retry-After" in resp.headers, "HTTP 429 must include Retry-After header"
            data = resp.json()
            assert "detail" in data or "message" in data, "Must provide informative detail"

    print(f"Status codes across 15 attempts: {' '.join(str(c) for c in status_codes)}")
    # First 5 attempts must return 401 Unauthorized
    assert status_codes[:5] == [401, 401, 401, 401, 401], f"Expected first 5 to be 401, got {status_codes[:5]}"
    # Attempts 6 through 15 must return 429 Too Many Requests
    assert status_codes[5:] == [429] * 10, f"Expected remaining 10 to be 429, got {status_codes[5:]}"
    print("[PASS] PoC reproduction strictly verified: 5x 401 followed by 10x 429!")

    print("\n--- TEST 2: Successful Login Resets Failure Counter ---")
    login_rate_limiter.reset()
    client_ip = "198.51.100.2"

    # 3 failed attempts
    for _ in range(3):
        resp = client.post(
            "/api/auth/login",
            json={"email": "owner@rupiclothing.in", "password": "wrongpassword"},
            headers={"x-forwarded-for": client_ip}
        )
        assert resp.status_code == 401

    # Valid login succeeds and resets failure history
    success_resp = client.post(
        "/api/auth/login",
        json={"email": "owner@rupiclothing.in", "password": "password123"},
        headers={"x-forwarded-for": client_ip}
    )
    assert success_resp.status_code == 200, f"Valid login failed: {success_resp.text}"

    # Another 4 failed attempts should succeed with 401, NOT 429 (since counter was reset)
    for _ in range(4):
        resp = client.post(
            "/api/auth/login",
            json={"email": "owner@rupiclothing.in", "password": "wrongpassword"},
            headers={"x-forwarded-for": client_ip}
        )
        assert resp.status_code == 401, f"Expected 401 after reset, got {resp.status_code}"
    print("[PASS] Successful login cleanly resets failure history!")

    print("\n--- TEST 3: Account-Level Lockout Across Distributed IPs ---")
    login_rate_limiter.reset()
    target_email = "victim@example.com"

    # 5 different IPs attack the same target account
    for i in range(1, 6):
        resp = client.post(
            "/api/auth/login",
            json={"email": target_email, "password": f"attempt_{i}"},
            headers={"x-forwarded-for": f"203.0.113.{i}"}
        )
        assert resp.status_code == 401

    # 6th attempt from a brand-new IP targeting the same account should be blocked with 429
    blocked_resp = client.post(
        "/api/auth/login",
        json={"email": target_email, "password": "password_from_new_ip"},
        headers={"x-forwarded-for": "203.0.113.99"}
    )
    assert blocked_resp.status_code == 429, f"Expected 429 for locked account, got {blocked_resp.status_code}"
    assert "account" in blocked_resp.json().get("detail", "").lower(), "Error message should mention account"
    print("[PASS] Account-level brute force protection verified across distributed IPs!")

    print("\n--- TEST 4: IP-Level Lockout Across Username Spraying ---")
    login_rate_limiter.reset()
    attacker_ip = "192.0.2.77"

    # Attacker tries 5 different emails from the same IP
    for i in range(1, 6):
        resp = client.post(
            "/api/auth/login",
            json={"email": f"user_{i}@example.com", "password": "CommonPassword123!"},
            headers={"x-forwarded-for": attacker_ip}
        )
        assert resp.status_code == 401

    # 6th attempt against yet another user from the same IP must be blocked
    spray_blocked = client.post(
        "/api/auth/login",
        json={"email": "another_user@example.com", "password": "CommonPassword123!"},
        headers={"x-forwarded-for": attacker_ip}
    )
    assert spray_blocked.status_code == 429, f"Expected 429 for IP spraying, got {spray_blocked.status_code}"
    assert "ip" in spray_blocked.json().get("detail", "").lower(), "Error message should mention IP"
    print("[PASS] IP-level brute force lockout verified against username spraying!")

    print("\n========================================================")
    print("ALL AUTH RATE LIMITING & BRUTE FORCE TESTS PASSED 100%!")
    print("========================================================\n")

if __name__ == "__main__":
    test_auth_rate_limiting()
