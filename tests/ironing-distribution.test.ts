import { describe, expect, it } from "vitest";
import { distributeIroningUnits } from "../lib/rules/ironing-distribution";

describe("ironing distribution", () => {
  it("does not assign work if no present ironing technicians exist", () => {
    const result = distributeIroningUnits([], [{ id: "u1", value: 50 }]);
    expect(result.assigned).toBe(0);
    expect(result.message).toContain("لا يوجد فني");
  });

  it("balances units across present technicians", () => {
    const result = distributeIroningUnits(
      [{ id: "farag", checkInAt: "09:00" }, { id: "morsi", checkInAt: "12:00" }],
      [
        { id: "u1", value: 80 },
        { id: "u2", value: 70 },
        { id: "u3", value: 60 },
        { id: "u4", value: 50 },
      ],
    );
    const assigned = Object.values(result.assignments);
    expect(result.assigned).toBe(4);
    expect(assigned.filter((x) => x === "farag").length).toBe(2);
    expect(assigned.filter((x) => x === "morsi").length).toBe(2);
  });

  it("considers existing open work before assigning more units", () => {
    const result = distributeIroningUnits(
      [{ id: "busy", openPieces: 4, openValue: 300 }, { id: "free", openPieces: 0, openValue: 0 }],
      [{ id: "u1", value: 80 }],
    );
    expect(result.assignments.u1).toBe("free");
  });
});
