import { DATA_MODE } from "@/lib/config";
import { httpRequest, setAuthToken, setActiveBusinessId, getAuthToken } from "@/lib/api/client";
import { db, delay } from "@/mocks/store";

export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface BusinessSummary {
  id: string;
  name: string;
  currency: string;
  openingCashPaise: number;
  safetyThresholdPaise: number;
}

export interface AuthSession {
  token: string;
  user: User;
  business: BusinessSummary;
  businesses: BusinessSummary[];
}

const AUTH_USER_KEY = "ripple_auth_user";
const AUTH_BIZ_KEY = "ripple_auth_biz";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredBusiness(): BusinessSummary | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_BIZ_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

import { syncSimulatorStoreWithBusiness } from "@/lib/simulatorStore";

export function setStoredSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem("access_token", session.token);
    setAuthToken(session.token);
    setActiveBusinessId(session.business.id);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
    localStorage.setItem(AUTH_BIZ_KEY, JSON.stringify(session.business));
    syncSimulatorStoreWithBusiness(session.business.id, session.business.name);
  } else {
    localStorage.removeItem("access_token");
    setAuthToken(null);
    setActiveBusinessId(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_BIZ_KEY);
    syncSimulatorStoreWithBusiness();
  }
}

export function updateStoredBusiness(biz: Partial<BusinessSummary>): void {
  if (typeof window === "undefined") return;
  const existing = getStoredBusiness();
  if (existing) {
    const updated = { ...existing, ...biz };
    localStorage.setItem(AUTH_BIZ_KEY, JSON.stringify(updated));
    syncSimulatorStoreWithBusiness(updated.id, updated.name);
  }
}

export function isUserAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("access_token") || getAuthToken();
  if (!token) return false;

  // Verify JWT expiration if applicable
  try {
    const parts = token.split(".");
    if (parts.length === 3 && parts[1]) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        setStoredSession(null);
        return false;
      }
    }
  } catch {
    // Non-JWT token (e.g. mock session token), consider valid as long as token exists
  }
  return true;
}

export interface RegisterResult {
  success: boolean;
  message: string;
  email: string;
  phoneNumber?: string;
  requiresVerification: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  debugOtp?: string;
  user: User;
  business: BusinessSummary;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    if (DATA_MODE === "mock") {
      await delay(300);
      const session: AuthSession = {
        token: "demo_mock_jwt_token",
        user: {
          id: "usr_owner",
          email: email || "owner@rupiclothing.in",
          fullName: "Demo Owner",
        },
        business: {
          id: db.business.id,
          name: db.business.name,
          currency: db.business.currency,
          openingCashPaise: db.business.openingCashPaise,
          safetyThresholdPaise: db.business.safetyThresholdPaise ?? 500_000,
        },
        businesses: [
          {
            id: db.business.id,
            name: db.business.name,
            currency: db.business.currency,
            openingCashPaise: db.business.openingCashPaise,
            safetyThresholdPaise: db.business.safetyThresholdPaise ?? 500_000,
          },
        ],
      };
      setStoredSession(session);
      return session;
    }

    const res = await httpRequest<{
      access_token: string;
      token_type: string;
      user: { id: string; email: string; full_name: string };
      business: BusinessSummary;
      businesses: BusinessSummary[];
    }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    const session: AuthSession = {
      token: res.access_token,
      user: {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.full_name,
      },
      business: res.business,
      businesses: res.businesses || [res.business],
    };
    setStoredSession(session);
    return session;
  },

  async register(
    email: string,
    password: string,
    fullName: string,
    businessName: string = "My Business",
    phoneNumber?: string,
  ): Promise<RegisterResult> {
    if (DATA_MODE === "mock") {
      await delay(100);
      db.customers = [];
      db.suppliers = [];
      db.invoices = [];
      db.purchaseOrders = [];
      db.customerOrders = [];
      db.inventoryItems = [];
      db.inventory = [];
      db.inventoryMovements = [];
      db.products = [];
      db.payments = [];
      db.riskAlerts = [];
      db.recommendations = [];
      db.cashFlowEvents = [];
      db.business = {
        ...db.business,
        id: "biz_fresh",
        name: businessName,
      };
      const user: User = {
        id: "usr_mock_new",
        email,
        fullName,
      };
      const business: BusinessSummary = {
        id: db.business.id,
        name: db.business.name,
        currency: db.business.currency,
        openingCashPaise: db.business.openingCashPaise,
        safetyThresholdPaise: db.business.safetyThresholdPaise ?? 500_000,
      };
      return {
        success: true,
        message: "OTP sent to email and WhatsApp",
        email,
        phoneNumber,
        requiresVerification: true,
        isEmailVerified: false,
        isPhoneVerified: false,
        debugOtp: "123456",
        user,
        business,
      };
    }

    const res = await httpRequest<{
      success?: boolean;
      message?: string;
      email?: string;
      phone_number?: string;
      requires_verification?: boolean;
      is_email_verified?: boolean;
      is_phone_verified?: boolean;
      debug_otp?: string;
      user?: { id: string; email: string; full_name: string };
      business?: BusinessSummary;
    }>("/api/auth/register", {
      method: "POST",
      body: {
        email,
        password,
        full_name: fullName,
        business_name: businessName,
        phone_number: phoneNumber || null,
      },
    });

    const user: User = {
      id: res.user?.id || `usr_${res.email || email}`,
      email: res.user?.email || res.email || email,
      fullName: res.user?.full_name || fullName,
    };
    const business: BusinessSummary = res.business || {
      id: "biz_registered",
      name: businessName,
      currency: "INR",
      openingCashPaise: 1_000_000,
      safetyThresholdPaise: 500_000,
    };

    return {
      success: res.success ?? true,
      message: res.message || "OTP sent to email and WhatsApp. Verification required before login.",
      email: res.email || email,
      phoneNumber: res.phone_number || phoneNumber,
      requiresVerification: res.requires_verification ?? true,
      isEmailVerified: res.is_email_verified ?? false,
      isPhoneVerified: res.is_phone_verified ?? false,
      debugOtp: res.debug_otp,
      user,
      business,
    };
  },

  async verifyOtp(
    email: string,
    otp: string,
    channel: "email" | "phone" = "email",
  ): Promise<AuthSession & { emergencyDispatchUnlocked?: boolean }> {
    if (DATA_MODE === "mock") {
      await delay(300);
      if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        throw new Error("Verification code must be exactly 6 digits.");
      }
      const existingUser = getStoredUser();
      const existingBiz = getStoredBusiness();
      const session: AuthSession = {
        token: "demo_mock_verified_jwt_token",
        user: {
          id: existingUser?.id || "usr_verified",
          email: email || existingUser?.email || "owner@rupiclothing.in",
          fullName: existingUser?.fullName || "Verified Owner",
        },
        business: existingBiz || {
          id: db.business.id,
          name: db.business.name,
          currency: db.business.currency,
          openingCashPaise: db.business.openingCashPaise,
          safetyThresholdPaise: db.business.safetyThresholdPaise ?? 500_000,
        },
        businesses: [],
      };
      setStoredSession(session);
      return { ...session, emergencyDispatchUnlocked: true };
    }

    const res = await httpRequest<{
      success: boolean;
      message: string;
      access_token: string;
      user: { id: string; email: string; full_name: string; phone_number?: string };
      business: BusinessSummary;
      emergency_dispatch_unlocked: boolean;
    }>("/api/auth/verify-otp", {
      method: "POST",
      body: { email, otp, channel },
    });

    const session: AuthSession = {
      token: res.access_token,
      user: {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.full_name,
      },
      business: res.business,
      businesses: [res.business],
    };
    setStoredSession(session);
    return { ...session, emergencyDispatchUnlocked: res.emergency_dispatch_unlocked };
  },

  async resendOtp(
    email: string,
    channel: "email" | "phone" = "email",
  ): Promise<{ success: boolean; message: string; cooldownSeconds?: number; debug_otp?: string }> {
    if (DATA_MODE === "mock") {
      await delay(200);
      return {
        success: true,
        message: `Fresh 6-digit verification code dispatched to ${channel}.`,
        cooldownSeconds: 60,
        debug_otp: "123456",
      };
    }

    return httpRequest<{ success: boolean; message: string; cooldownSeconds?: number; debug_otp?: string }>(
      "/api/auth/resend-otp",
      {
        method: "POST",
        body: { email, channel },
      },
    );
  },

  async getMe(): Promise<{ user: User; business: BusinessSummary; businesses: BusinessSummary[] }> {
    if (DATA_MODE === "mock") {
      await delay(100);
      return {
        user: {
          id: "usr_owner",
          email: "owner@rupiclothing.in",
          fullName: "Demo Owner",
        },
        business: {
          id: db.business.id,
          name: db.business.name,
          currency: db.business.currency,
          openingCashPaise: db.business.openingCashPaise,
          safetyThresholdPaise: db.business.safetyThresholdPaise ?? 500_000,
        },
        businesses: [
          {
            id: db.business.id,
            name: db.business.name,
            currency: db.business.currency,
            openingCashPaise: db.business.openingCashPaise,
            safetyThresholdPaise: db.business.safetyThresholdPaise ?? 500_000,
          },
        ],
      };
    }

    const res = await httpRequest<{
      user: { id: string; email: string; full_name: string };
      business: BusinessSummary;
      businesses: BusinessSummary[];
    }>("/api/auth/me");

    return {
      user: {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.full_name,
      },
      business: res.business,
      businesses: res.businesses || [],
    };
  },

  async switchBusiness(businessId: string): Promise<AuthSession> {
    if (DATA_MODE === "mock") {
      await delay(150);
      return await this.login("owner@rupiclothing.in", "password123");
    }

    const res = await httpRequest<{
      access_token: string;
      token_type: string;
      user: { id: string; email: string; full_name: string };
      business: BusinessSummary;
      businesses: BusinessSummary[];
    }>(`/api/auth/switch-business/${businessId}`, {
      method: "POST",
    });

    const session: AuthSession = {
      token: res.access_token,
      user: {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.full_name,
      },
      business: res.business,
      businesses: res.businesses || [res.business],
    };
    setStoredSession(session);
    return session;
  },

  logout(): void {
    setStoredSession(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },
};
