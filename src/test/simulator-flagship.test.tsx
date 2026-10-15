import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { SimulatorTrueMarginCard } from "@/components/simulator/simulator-true-margin";
import { SimulatorEventTimeline } from "@/components/simulator/simulator-results";
import {
  AutoPhaseDialog,
  SplitEscrowDialog,
  NodeInspectionDialog,
} from "@/components/simulator/simulator-rescues";
import { SimulatorControlPanel } from "@/components/simulator/simulator-controls";
import type { SimulatorResult } from "@/lib/api/simulationApi";
import type {
  TrueMarginData,
  SimulatorTimelineNode,
  AutoPhasePreview,
  SplitEscrowPreview,
  ChaosStressTestResult,
} from "@/types";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Simulator Flagship Innovations — Unit & UI Tests", () => {
  // ─── 1. True Margin Tests ──────────────────────────────────────────────
  describe("Feature B: Ripple-Adjusted True Margin", () => {
    const mockMargin: TrueMarginData = {
      revenuePaise: 50_000_000, // ₹5,00,000
      directCogsPaise: 37_500_000, // ₹3,75,000
      paperMarginPaise: 12_500_000, // ₹1,25,000
      paperMarginPercent: 25.0,
      contagionDays: 13,
      breakdown: {
        lostDiscountPaise: 360_000, // ₹3,600
        supplierHaltFeesPaise: 3_250_000, // ₹32,500 (13d * ₹2,500)
        slaPenaltiesPaise: 3_900_000, // ₹39,000 (13d * ₹3,000)
        workingCapitalDragPaise: 1_820_000, // ₹18,200 (13d * ₹1,400)
        floatFeePaise: 0,
      },
      totalContagionCostPaise: 9_330_000, // ₹93,300
      trueRippleMarginPaise: 3_170_000, // ₹31,700
      trueRippleMarginPercent: 6.34,
      explanation:
        "Paper Margin ₹1,25,000 (25.0%) reduced by ₹93,300 contagion to ₹31,700 True Margin (6.34%).",
    };

    it("renders Paper Margin vs True Ripple Margin accurately", () => {
      render(<SimulatorTrueMarginCard margin={mockMargin} />);

      // Should display Paper Margin 25.0% and True Margin 6.34%
      expect(screen.getAllByText(/25/)[0]).toBeDefined();
      expect(screen.getAllByText(/6\.34/)[0]).toBeDefined();
      expect(screen.getAllByText(/1,25,000/)[0]).toBeDefined();
      expect(screen.getAllByText(/31,700/)[0]).toBeDefined();
      expect(screen.getAllByText(/93,300/)[0]).toBeDefined();

      // The revenue/COGS line must reflect `revenuePaise`. This assertion exists
      // because the fixture previously declared a non-existent field, so the
      // revenue path was never exercised by any test.
      expect(screen.getAllByText(/Revenue:/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/5,00,000/).length).toBeGreaterThan(0);

      // Check itemized contagion breakdown
      expect(screen.getByText("Lost Supplier Early Discount")).toBeDefined();
      expect(screen.getByText(/Supplier Late Penalties/)).toBeDefined();
      expect(screen.getByText("Secondary Customer SLA Penalties")).toBeDefined();
      expect(screen.getByText(/Working-Capital Float Drag/)).toBeDefined();
    });
  });

  // ─── 2. Fragility Multiplier & Timeline ──────────────────────────────────
  describe("Feature A: Fragility Multiplier & Chaos Timeline Node", () => {
    const mockNodes: SimulatorTimelineNode[] = [
      {
        id: "node-apex",
        label: "Apex Corp (INV-2001)",
        type: "customer_receivable",
        dayLabel: "Day 15 (Delayed to Day 31)",
        date: "Day 31",
        amountPaise: 50_000_000,
        direction: "incoming",
        status: "Delayed +16d",
        counterparty: "Apex Corp",
        description: "Customer invoice receivable delayed from Day 15 to Day 31.",
        fragility: {
          nodeId: "node-apex",
          multiplier: 20.0,
          isKeystone: true,
          badgeText: "Ripple Risk: 20x",
          badgeVariant: "destructive",
          downstreamValueAtRiskPaise: 80_000_000,
          invoiceAmountPaise: 4_000_000,
          exposedOrders: ["Kaveri Timber (PO-1) ₹1.2L", "Metro Retail (ORD-801) ₹1.65L"],
        },
      },
      {
        id: "node-kaveri",
        label: "Kaveri Timber (PO-1)",
        type: "supplier_payable",
        dayLabel: "Day 18",
        date: "Day 18",
        amountPaise: 12_000_000,
        direction: "outgoing",
        status: "At Risk (₹20k Shortfall)",
        counterparty: "Kaveri Timber",
        description: "Raw material timber commitment required for Metro Retail fulfillment.",
        isEligibleForAutoPhase: true,
        isEligibleForSplitEscrow: true,
      },
    ];

    const mockResult: SimulatorResult = {
      baselinePoints: [],
      scenarioPoints: [],
      baselineClosingPaise: 15_000_000,
      scenarioClosingPaise: 13_000_000,
      baselineMinPaise: 10_000_000,
      baselineMinDate: "2026-10-18",
      scenarioMinPaise: -2_000_000,
      scenarioMinDate: "2026-10-18",
      shortfallPaise: 2_000_000,
      affectedDependencies: [],
      rippleScore: {
        cashShortfallFactor: 30,
        delayMagnitudeFactor: 16,
        downstreamCountFactor: 15,
        liquidityGapFactor: 12,
        totalScore: 73,
      },
      recommendations: [],
      timelineNodes: mockNodes,
    };

    it("displays the calculated 20x keystone fragility badge", () => {
      const inspectSpy = vi.fn();
      render(<SimulatorEventTimeline result={mockResult} onInspectNode={inspectSpy} />);

      const badge = screen.getByText("Ripple Risk: 20x");
      expect(badge).toBeDefined();

      fireEvent.click(badge);
      expect(inspectSpy).toHaveBeenCalledWith(mockNodes[0]);
    });

    it("renders action buttons for eligible supplier nodes", () => {
      const autoPhaseSpy = vi.fn();
      const splitEscrowSpy = vi.fn();

      render(
        <SimulatorEventTimeline
          result={mockResult}
          onAutoPhaseClick={autoPhaseSpy}
          onSplitEscrowClick={splitEscrowSpy}
        />,
      );

      const autoPhaseBtn = screen.getByText("Auto-Phase Inventory");
      const splitEscrowBtn = screen.getByText("Lock Tri-Party Split-Escrow");
      expect(autoPhaseBtn).toBeDefined();
      expect(splitEscrowBtn).toBeDefined();

      fireEvent.click(autoPhaseBtn);
      expect(autoPhaseSpy).toHaveBeenCalledWith(mockNodes[1]);

      fireEvent.click(splitEscrowBtn);
      expect(splitEscrowSpy).toHaveBeenCalledWith(mockNodes[1]);
    });
  });

  // ─── 3. Auto-Phase Inventory Dialog ─────────────────────────────────────
  describe("Feature C: Auto-Phase Inventory Preview & Dialog", () => {
    const mockPreview: AutoPhasePreview = {
      supplierCommitmentPaise: 12_000_000, // ₹1,20,000
      actualAvailableCashPaise: 15_000_000,
      safetyBufferPaise: 5_000_000, // ₹50,000
      usableFreeCashPaise: 10_000_000, // ₹1,00,000
      shortfallPaise: 2_000_000, // ₹20,000
      batch1: {
        amountPaise: 10_000_000, // ₹1,00,000
        date: "Day 18",
        label: "Batch 1 (Immediate Operational Safe Tranche)",
        purpose: "Funded from usable free cash; preserves safety buffer.",
      },
      batch2: {
        amountPaise: 2_000_000, // ₹20,000
        date: "Day 32",
        label: "Batch 2 (Synchronized Post-Collection Tranche)",
        purpose: "Scheduled 1 day after expected customer receipt on Day 31.",
      },
      safetyBufferPreserved: true,
      explanation:
        "Order ₹1,20,000 split into Batch 1 (₹1,00,000 on Day 18) and Batch 2 (₹20,000 on Day 32).",
    };

    it("renders exact batch amounts and safety buffer preservation", () => {
      const confirmSpy = vi.fn();
      render(
        <AutoPhaseDialog
          open={true}
          onOpenChange={() => {}}
          preview={mockPreview}
          isLoading={false}
          onConfirm={confirmSpy}
        />,
      );

      expect(screen.getByText("Auto-Phase Inventory Rescue Preview")).toBeDefined();
      expect(screen.getByText("₹1,20,000")).toBeDefined();
      expect(screen.getByText("₹50,000")).toBeDefined();
      expect(screen.getByText("₹1,00,000")).toBeDefined();
      expect(screen.getByText("₹20,000")).toBeDefined();
      expect(screen.getByText("Day 18")).toBeDefined();
      expect(screen.getByText("Day 32")).toBeDefined();

      const confirmBtn = screen.getByText("Confirm & Apply Auto-Phase");
      fireEvent.click(confirmBtn);
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  // ─── 4. Tri-Party Split-Escrow Dialog ───────────────────────────────────
  describe("Feature D: Zero-Cash Tri-Party Split-Escrow", () => {
    const mockPreview: SplitEscrowPreview = {
      customerInvoicePaise: 50_000_000, // ₹5,00,000
      supplierCommitmentPaise: 12_000_000, // ₹1,20,000
      floatFeePaise: 240_000, // ₹2,400 (2% float fee)
      totalDeductionPaise: 12_240_000, // ₹1,22,400
      netProceedsPaise: 37_760_000, // ₹3,77,600
      isEligible: true,
      supplierFundingDate: "Day 18",
      customerSettlementDate: "Day 31",
      bypassArcLabel: "Tri-Party Split-Escrow Bypass Arc",
      explanation:
        "Apex Corp receivable covers Kaveri Timber directly on Day 18 with zero business cash outflow.",
    };

    it("renders zero Day 18 cash outlay and net remittance proceeds", () => {
      const confirmSpy = vi.fn();
      render(
        <SplitEscrowDialog
          open={true}
          onOpenChange={() => {}}
          preview={mockPreview}
          isLoading={false}
          onConfirm={confirmSpy}
        />,
      );

      expect(screen.getByText("Tri-Party Split-Escrow Facility Preview")).toBeDefined();
      expect(screen.getByText("₹0.00 (Zero Outlay)")).toBeDefined();
      expect(screen.getByText("₹2,400")).toBeDefined();
      expect(screen.getByText("₹3,77,600")).toBeDefined();

      const lockBtn = screen.getByText("Lock Tri-Party Split-Escrow");
      fireEvent.click(lockBtn);
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  // ─── 5. Chaos Stress-Test Controls ──────────────────────────────────────
  describe("Feature A: Chaos Stress-Test Controls & Delta Display", () => {
    const mockStressResult: ChaosStressTestResult = {
      isStressTestActive: true,
      baselineMinCashPaise: 5_000_000,
      stressedMinCashPaise: -5_000_000,
      additionalShortfallPaise: 10_000_000,
      newlyAffectedNodesCount: 2,
      newlyEndangeredOrderValuePaise: 16_500_000,
      mostFragileNodeBefore: "node-apex",
      mostFragileNodeAfter: "node-kaveri",
      mostFragileNodeLabel: "Kaveri Timber (PO-1)",
      mostFragileMultiplier: 13.75,
      baselineTrueMargin: {} as any,
      stressedTrueMargin: {} as any,
      stressedResult: {},
      summary: "Chaos test applied +5d shock.",
    };

    it("displays the purple Chaos Stress-Test button and stress mode banner", () => {
      const stressSpy = vi.fn();
      const exitSpy = vi.fn();

      render(
        <SimulatorControlPanel
          controls={{
            supplierDeliveryDelayDays: 0,
            customerPaymentDelayDays: 0,
            customerPaymentAmountPaise: null,
            supplierPaymentAmountPaise: null,
            orderQuantityMultiplier: 1.0,
            horizonDays: 30,
          }}
          isRunning={false}
          isSaving={false}
          hasResult={true}
          onChange={() => {}}
          onReset={() => {}}
          onRun={() => {}}
          onSave={() => {}}
          onChaosStressTest={stressSpy}
          isChaosTesting={false}
          chaosStressTestResult={mockStressResult}
          onExitChaosStressTest={exitSpy}
        />,
      );

      expect(screen.getByText("Stress Mode")).toBeDefined();
      expect(screen.getByText("Chaos Shock: +5-Day Delay")).toBeDefined();
      expect(screen.getByText("+2")).toBeDefined();
      expect(screen.getByText("Run Chaos Stress-Test (+5d)")).toBeDefined();

      const exitBtn = screen.getByText("Exit");
      fireEvent.click(exitBtn);
      expect(exitSpy).toHaveBeenCalled();
    });
  });
});
