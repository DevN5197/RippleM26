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
    setAuthToken(session.token);
    setActiveBusinessId(session.business.id);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
    localStorage.setItem(AUTH_BIZ_KEY, JSON.stringify(session.business));
    syncSimulatorStoreWithBusiness(session.business.id, session.business.name);
  } else {
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
  if (DATA_MODE === "mock") return true;
  return !!getAuthToken();
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
  ): Promise<AuthSession> {
    if (DATA_MODE === "mock") {
      await delay(300);
      db.business = {
        ...db.business,
        id: "biz_registered",
        name: businessName,
        currency: "INR",
        openingCashPaise: 1_000_000,
        safetyThresholdPaise: 500_000,
      };
      db.invoices = [];
      db.payments = [];
      db.cashFlowEvents = [];
      db.suppliers = [];
      db.customers = [];
      db.products = [];
      db.inventory = [];
      db.inventoryMovements = [];
      db.purchaseOrders = [];
      db.customerOrders = [];
      db.simulationScenarios = [];
      db.riskAlerts = [];
      db.recommendations = [];
      const session: AuthSession = {
        token: "demo_mock_jwt_token",
        user: {
          id: "usr_registered",
          email,
          fullName,
        },
        business: {
          id: "biz_registered",
          name: businessName,
          currency: "INR",
          openingCashPaise: 1_000_000,
          safetyThresholdPaise: 500_000,
        },
        businesses: [],
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
    }>("/api/auth/register", {
      method: "POST",
      body: {
        email,
        password,
        full_name: fullName,
        business_name: businessName,
      },
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
      window.location.href = "/login";
    }
  },
};
