import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getGeminiApiKey,
  setGeminiApiKey,
  getGeminiApiKeySource,
  callGeminiAPI,
} from "@/lib/gemini";
import { getLiveCrossPageState } from "@/lib/crossPageState";
import { generateSmartLocalResponse } from "@/lib/aiFallback";
import { simulatorStore } from "@/lib/simulatorStore";

describe("Google AI Studio (Gemini API) & Cross-Page State Linking", () => {
  beforeEach(() => {
    localStorage.clear();
    simulatorStore.loadPreset("baseline");
  });

  describe("1. Gemini API Key Resolution & Safety", () => {
    it("reads API key from localStorage when custom override is set", () => {
      setGeminiApiKey("AIzaSyCustomKey123");
      expect(getGeminiApiKey()).toBe("AIzaSyCustomKey123");
      expect(getGeminiApiKeySource()).toBe("localStorage");
    });

    it("clears API key from localStorage when empty", () => {
      setGeminiApiKey("AIzaSyCustomKey123");
      setGeminiApiKey("");
      expect(localStorage.getItem("rupi_gemini_api_key")).toBeNull();
    });

    it("throws a clear error when calling Gemini API without a key to trigger the Hackathon Safety Net", async () => {
      setGeminiApiKey("");
      await expect(
        callGeminiAPI({
          prompt: "Hello",
          systemInstruction: "You are an assistant",
          apiKeyOverride: "",
        }),
      ).rejects.toThrow("Missing Gemini API Key");
    });
  });

  describe("2. Cross-Page Real-Time State Serialization", () => {
    it("serializes live Business Overview state with exact required figures", () => {
      const state = getLiveCrossPageState();

      expect(state.overview.businessName).toBe("Rupi Clothing");
      expect(state.overview.availableCashOnHandFormatted).toBe("₹5,000");
      expect(state.overview.safetyReserveFormatted).toBe("₹5,000");
      expect(state.overview.incomingReceivablesFormatted).toBe("+₹22,500");
      expect(state.overview.openInvoiceCount).toBe(6);
      expect(state.overview.committedPayablesFormatted).toBe("-₹53,700");
      expect(state.overview.projectedDipDate).toBe("2026-10-25");
      expect(state.overview.projectedDipAmountFormatted).toBe("-₹2,500");

      // Key upcoming transactions
      const txLabels = state.overview.upcomingTransactions.map((t) => t.label);
      expect(txLabels).toContain("Supplier Advance - Shree Textiles (PO-1)");
      expect(txLabels).toContain("Bandhra West Shop Lease");
      expect(txLabels).toContain("Expected Customer Receipt - Urban Threads (INV)");
      expect(txLabels).toContain("Store Staff Salary Run");
    });

    it("dynamically reads active scenario state when switching presets in simulator store", () => {
      // Load Apex Flagship scenario
      simulatorStore.loadPreset("flagship");
      let state = getLiveCrossPageState();

      expect(state.simulator.activePreset).toBe("Apex Flagship (+16d)");
      expect(state.simulator.customerPaymentDelayDays).toBe(16);
      expect(state.simulator.customerPaymentAmountFormatted).toBe("₹5,00,000");
      expect(state.simulator.supplierPaymentAmountFormatted).toBe("₹1,20,000");
      expect(state.simulator.paperMarginPercent).toBe("25%");
      expect(state.simulator.paperMarginFormatted).toBe("₹1,25,000");
      expect(state.simulator.trueRippleMarginPercent).toBe("6.34%");
      expect(state.simulator.rippleContagionDragFormatted).toBe("-₹93,300");

      // Verify keystone nodes
      const apexNode = state.simulator.dependencyNodes.find((n) => n.name.includes("Apex Corp"));
      expect(apexNode).toBeDefined();
      expect(apexNode?.riskMultiplier).toContain("20.0x - Critical Keystone");

      const kaveriNode = state.simulator.dependencyNodes.find((n) => n.name.includes("Kaveri Timber"));
      expect(kaveriNode).toBeDefined();
      expect(kaveriNode?.riskMultiplier).toContain("1.4x Ripple Risk");
    });

    it("injects all 5 strict operational rules into Gemini system instruction", () => {
      const state = getLiveCrossPageState();
      const prompt = state.systemPromptString;

      expect(prompt).toContain("Ripple AI Financial Copilot for Rupi Clothing");
      expect(prompt).toContain("RULE 1 (ALWAYS GROUNDED IN LIVE NUMBERS)");
      expect(prompt).toContain("RULE 2 (EXPOSE THE PAPER VS. TRUE MARGIN ILLUSION)");
      expect(prompt).toContain("RULE 3 (HIGHLIGHT KEYSTONE FRAGILITY)");
      expect(prompt).toContain("RULE 4 (ZERO-DEBT AUTONOMOUS RESCUES FIRST)");
      expect(prompt).toContain("RULE 5 (CLEAN EXECUTIVE FORMATTING");
      expect(prompt).toContain("Auto-Phase Inventory (Micro-Batching)");
      expect(prompt).toContain("Lock Tri-Party Split-Escrow (Zero-Cash Redirect)");
    });
  });

  describe("3. Deterministic Hackathon Safety Net (Fallback Generator)", () => {
    it("generates live-grounded response for 'How can I improve my cash flow?'", () => {
      const reply = generateSmartLocalResponse("How can I improve my cash flow?");

      expect(reply.isFallback).toBe(true);
      expect(reply.text).toContain("Rupi Clothing");
      expect(reply.text).toContain("₹5,000");
      expect(reply.text).toContain("+₹22,500");
      expect(reply.text).toContain("-₹53,700");
      expect(reply.text).toContain("Tri-Party Split-Escrow");
      expect(reply.text).toContain("Auto-Phase Inventory");
      expect(reply.actionPills?.map((p) => p.id)).toContain("apply_split_escrow");
      expect(reply.actionPills?.map((p) => p.id)).toContain("apply_auto_phase");
    });

    it("generates live-grounded response for 'Which invoices are overdue?' highlighting Apex Corp Keystone", () => {
      const reply = generateSmartLocalResponse("Which invoices are overdue?");

      expect(reply.text).toContain("Urban Threads (INV-2001)");
      expect(reply.text).toContain("+₹8,000");
      expect(reply.text).toContain("Apex Corp (#INV-APEX)");
      expect(reply.text).toContain("20.0x Ripple Risk Multiplier (Critical Keystone)");
      expect(reply.actionPills?.map((p) => p.id)).toContain("load_apex");
    });

    it("generates live-grounded response for 'Am I at risk of a cash crunch?'", () => {
      const reply = generateSmartLocalResponse("Am I at risk of a cash crunch?");

      expect(reply.text).toContain("Bandhra West Shop Lease");
      expect(reply.text).toContain("-₹2,500");
      expect(reply.text).toContain("Shree Textiles (PO-1)");
      expect(reply.text).toContain("-₹5,000");
      expect(reply.text).toContain("Lost Supplier Early Discount");
    });

    it("generates live-grounded response for 'How's my supplier payment health?'", () => {
      const reply = generateSmartLocalResponse("How's my supplier payment health?");

      expect(reply.text).toContain("Shree Textiles (PO-1)");
      expect(reply.text).toContain("Kaveri Timber");
      expect(reply.text).toContain("-₹1,20,000");
      expect(reply.text).toContain("1.4x Ripple Risk Multiplier");
      expect(reply.text).toContain("Batch 1 (₹1,00,000)");
      expect(reply.text).toContain("Batch 2 (₹20,000)");
    });
  });

  describe("4. Autonomous Rescues State Tracking", () => {
    it("tracks Auto-Phase execution in shared simulator store", () => {
      expect(simulatorStore.getState().rescues.autoPhaseApplied).toBe(false);

      simulatorStore.applyAutoPhase();
      expect(simulatorStore.getState().rescues.autoPhaseApplied).toBe(true);

      const state = getLiveCrossPageState();
      expect(state.simulator.activeRescues.autoPhaseApplied).toBe(true);
      expect(state.systemPromptString).toContain("Auto-Phase Inventory: ACTIVE");
    });

    it("tracks Tri-Party Split-Escrow execution in shared simulator store", () => {
      expect(simulatorStore.getState().rescues.splitEscrowLocked).toBe(false);

      simulatorStore.applySplitEscrow();
      expect(simulatorStore.getState().rescues.splitEscrowLocked).toBe(true);

      const state = getLiveCrossPageState();
      expect(state.simulator.activeRescues.splitEscrowLocked).toBe(true);
      expect(state.systemPromptString).toContain("Lock Tri-Party Split-Escrow: LOCKED");
    });

    it("reverts rescues cleanly", () => {
      simulatorStore.applyAutoPhase();
      simulatorStore.applySplitEscrow();
      expect(simulatorStore.getState().rescues.autoPhaseApplied).toBe(true);

      simulatorStore.revertRescues();
      expect(simulatorStore.getState().rescues.autoPhaseApplied).toBe(false);
      expect(simulatorStore.getState().rescues.splitEscrowLocked).toBe(false);
    });
  });
});
