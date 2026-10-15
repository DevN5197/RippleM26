import type { SimulatorControls, SimulatorResult, ChaosStressTestResult } from "@/types";

export type SimulatorPreset = "baseline" | "flagship" | "chaos" | "custom_17d" | "custom";

export interface SharedSimulatorState {
  preset: SimulatorPreset;
  presetLabel: string;
  controls: SimulatorControls;
  result: SimulatorResult | null;
  chaosResult: ChaosStressTestResult | null;
  rescues: {
    autoPhaseApplied: boolean;
    autoPhaseTimestamp?: string;
    splitEscrowLocked: boolean;
    splitEscrowTimestamp?: string;
  };
}

export const DEFAULT_CONTROLS: SimulatorControls = {
  supplierDeliveryDelayDays: 0,
  customerPaymentDelayDays: 0,
  customerPaymentAmountPaise: null,
  supplierPaymentAmountPaise: null,
  orderQuantityMultiplier: 1.0,
  horizonDays: 30,
};

export const FLAGSHIP_CONTROLS: SimulatorControls = {
  supplierDeliveryDelayDays: 0,
  customerPaymentDelayDays: 16,
  customerPaymentAmountPaise: 50_000_000, // ₹5,00,000 Apex Corp
  supplierPaymentAmountPaise: 12_000_000, // ₹1,20,000 Kaveri Timber
  orderQuantityMultiplier: 1.0,
  horizonDays: 30,
};

export const CUSTOM_17D_CONTROLS: SimulatorControls = {
  supplierDeliveryDelayDays: 0,
  customerPaymentDelayDays: 17,
  customerPaymentAmountPaise: 50_000_000,
  supplierPaymentAmountPaise: 12_000_000,
  orderQuantityMultiplier: 1.0,
  horizonDays: 30,
};

const AUTH_BIZ_STORAGE_KEY = "ripple_auth_biz";

export function isCurrentBusinessDemo(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(AUTH_BIZ_STORAGE_KEY);
    if (!raw) return true;
    const biz = JSON.parse(raw);
    return !biz || biz.name === "Rupi Clothing" || biz.id === "biz_1";
  } catch {
    return true;
  }
}

export function getStorageKey(businessId?: string): string {
  if (businessId) return `ripple_simulator_state_${businessId}`;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(AUTH_BIZ_STORAGE_KEY);
      if (raw) {
        const biz = JSON.parse(raw);
        if (biz?.id) return `ripple_simulator_state_${biz.id}`;
      }
    } catch {
      // ignore
    }
  }
  return "rupi_simulator_shared_state";
}

function getInitialState(): SharedSimulatorState {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.controls) {
          return parsed;
        }
      }
    } catch {
      // LocalStorage error or SSR
    }
  }

  // Demo accounts default to Apex Flagship (+16d), new user accounts default to Baseline
  const isDemo = isCurrentBusinessDemo();
  if (isDemo) {
    return {
      preset: "flagship",
      presetLabel: "Apex Flagship (+16d)",
      controls: { ...FLAGSHIP_CONTROLS },
      result: null,
      chaosResult: null,
      rescues: {
        autoPhaseApplied: false,
        splitEscrowLocked: false,
      },
    };
  }

  return {
    preset: "baseline",
    presetLabel: "Baseline",
    controls: { ...DEFAULT_CONTROLS },
    result: null,
    chaosResult: null,
    rescues: {
      autoPhaseApplied: false,
      splitEscrowLocked: false,
    },
  };
}

let currentState: SharedSimulatorState = getInitialState();
const listeners = new Set<(state: SharedSimulatorState) => void>();

function notify() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(currentState));
    } catch {
      // Storage might be full or private browsing
    }
  }
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch (err) {
      console.error("Error in simulator state listener:", err);
    }
  });
}

export function syncSimulatorStoreWithBusiness(businessId?: string, businessName?: string): void {
  const isDemo = !businessName || businessName === "Rupi Clothing" || businessId === "biz_1";
  const key = getStorageKey(businessId);

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.controls) {
          currentState = parsed;
          notify();
          return;
        }
      }
    } catch {
      // Ignore
    }
  }

  if (isDemo) {
    currentState = {
      preset: "flagship",
      presetLabel: "Apex Flagship (+16d)",
      controls: { ...FLAGSHIP_CONTROLS },
      result: null,
      chaosResult: null,
      rescues: {
        autoPhaseApplied: false,
        splitEscrowLocked: false,
      },
    };
  } else {
    currentState = {
      preset: "baseline",
      presetLabel: "Baseline",
      controls: { ...DEFAULT_CONTROLS },
      result: null,
      chaosResult: null,
      rescues: {
        autoPhaseApplied: false,
        splitEscrowLocked: false,
      },
    };
  }
  notify();
}

export const simulatorStore = {
  getState(): SharedSimulatorState {
    return currentState;
  },

  subscribe(listener: (state: SharedSimulatorState) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setControls(controls: SimulatorControls, preset: SimulatorPreset = "custom", presetLabel?: string) {
    let label = presetLabel;
    if (!label) {
      if (preset === "flagship") label = "Apex Flagship (+16d)";
      else if (preset === "baseline") label = "Baseline";
      else if (preset === "custom_17d") label = "Custom +17d Delay";
      else if (preset === "chaos") label = "Chaos Stress-Test (+5d)";
      else label = `Custom (${controls.customerPaymentDelayDays}d payment / ${controls.supplierDeliveryDelayDays}d delivery)`;
    }

    currentState = {
      ...currentState,
      preset,
      presetLabel: label,
      controls: { ...controls },
    };
    notify();
  },

  setResult(result: SimulatorResult | null) {
    currentState = {
      ...currentState,
      result,
    };
    notify();
  },

  setChaosResult(chaosResult: ChaosStressTestResult | null) {
    currentState = {
      ...currentState,
      chaosResult,
      preset: chaosResult ? "chaos" : currentState.preset === "chaos" ? "baseline" : currentState.preset,
      presetLabel: chaosResult ? "Chaos Stress-Test (+5d)" : currentState.presetLabel,
    };
    notify();
  },

  applyAutoPhase() {
    currentState = {
      ...currentState,
      rescues: {
        ...currentState.rescues,
        autoPhaseApplied: true,
        autoPhaseTimestamp: new Date().toISOString(),
      },
    };
    notify();
  },

  applySplitEscrow() {
    currentState = {
      ...currentState,
      rescues: {
        ...currentState.rescues,
        splitEscrowLocked: true,
        splitEscrowTimestamp: new Date().toISOString(),
      },
    };
    notify();
  },

  revertRescues() {
    currentState = {
      ...currentState,
      rescues: {
        autoPhaseApplied: false,
        splitEscrowLocked: false,
      },
    };
    notify();
  },

  loadPreset(preset: "flagship" | "baseline" | "custom_17d" | "chaos") {
    if (preset === "flagship") {
      currentState = {
        ...currentState,
        preset: "flagship",
        presetLabel: "Apex Flagship (+16d)",
        controls: { ...FLAGSHIP_CONTROLS },
        chaosResult: null,
      };
    } else if (preset === "baseline") {
      currentState = {
        ...currentState,
        preset: "baseline",
        presetLabel: "Baseline",
        controls: { ...DEFAULT_CONTROLS },
        chaosResult: null,
      };
    } else if (preset === "custom_17d") {
      currentState = {
        ...currentState,
        preset: "custom_17d",
        presetLabel: "Custom +17d Delay",
        controls: { ...CUSTOM_17D_CONTROLS },
        chaosResult: null,
      };
    }
    notify();
  },
};
