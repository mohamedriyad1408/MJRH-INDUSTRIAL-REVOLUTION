import { describe, expect, it, vi } from "vitest";
import { validateOrderMove } from "../lib/station-workflow";

// Mock Supabase client for Workflow tests
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === "orders") {
          return {
            select: () => ({
              eq: (field: string, id: string) => ({
                single: () => {
                  if (id === "order-no-pieces") return Promise.resolve({ data: { id, status: "received", payment_status: "unpaid" }, error: null });
                  if (id === "order-reclean") return Promise.resolve({ data: { id, status: "cleaning", payment_status: "unpaid" }, error: null });
                  if (id === "order-ready-no-driver") return Promise.resolve({ data: { id, status: "ready", payment_status: "unpaid", assigned_driver_employee_id: null }, error: null });
                  if (id === "order-paid") return Promise.resolve({ data: { id, status: "out_for_delivery", payment_status: "paid", assigned_driver_employee_id: "drv-1" }, error: null });
                  return Promise.resolve({ data: { id, status: "cleaning", payment_status: "unpaid" }, error: null });
                },
              }),
            }),
          };
        }
        if (table === "service_units") {
          return {
            select: () => ({
              eq: (field: string, id: string) => {
                if (id === "order-no-pieces") return Promise.resolve({ data: [], error: null });
                if (id === "order-reclean") return Promise.resolve({ data: [{ id: "u1", service_type: "cleaning", current_stage: "cleaning", needs_reclean: true }], error: null });
                if (id === "order-paid") return Promise.resolve({ data: [{ id: "u2", service_type: "both", current_stage: "qc_passed", needs_reclean: false, label_status: "labeled" }], error: null });
                return Promise.resolve({ data: [{ id: "u3", service_type: "cleaning", current_stage: "qc_passed", needs_reclean: false, label_status: "labeled" }], error: null });
              },
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      },
    },
  };
});

describe("Core Station Workflow & RLS Guardrails", () => {
  it("prevents moving an order without pieces to operational stations", async () => {
    const res = await validateOrderMove("order-no-pieces", "cleaning");
    expect(res.ok).toBe(false);
    expect(res.message).toContain("بلا قطع");
  });

  it("prevents moving an order with open reclean pieces to ironing or packing", async () => {
    const res = await validateOrderMove("order-reclean", "ironing");
    expect(res.ok).toBe(false);
    expect(res.message).toContain("مرتجع غسيل");
  });

  it("prevents out_for_delivery if no driver is assigned", async () => {
    const res = await validateOrderMove("order-ready-no-driver", "out_for_delivery");
    expect(res.ok).toBe(false);
    expect(res.message).toContain("قبل تعيين مندوب");
  });

  it("allows delivery if payment is complete and all stages are qc_passed", async () => {
    const res = await validateOrderMove("order-paid", "delivered");
    expect(res.ok).toBe(true);
  });
});
