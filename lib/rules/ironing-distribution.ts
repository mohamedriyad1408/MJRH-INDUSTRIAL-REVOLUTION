export type IroningTech = { id: string; checkInAt?: string | null; openPieces?: number; donePieces?: number; openValue?: number; doneValue?: number };
export type IroningUnit = { id: string; value: number; shirtLike?: boolean };

function score(t: IroningTech) {
  const pieces = Number(t.openPieces ?? 0) + Number(t.donePieces ?? 0);
  const value = Number(t.openValue ?? 0) + Number(t.doneValue ?? 0);
  return pieces * 100 + value * 0.7;
}

function unitWeight(u: IroningUnit) {
  return 100 + Number(u.value || 0) * 0.7 + (u.shirtLike ? 65 : 0);
}

export function distributeIroningUnits(techs: IroningTech[], units: IroningUnit[]) {
  const loads = techs.map((t) => ({ ...t, openPieces: Number(t.openPieces ?? 0), openValue: Number(t.openValue ?? 0) }));
  const assignments: Record<string, string> = {};
  if (!loads.length) return { assignments, assigned: 0, employees: 0, message: "لا يوجد فني كي حاضر الآن" };

  const sorted = [...units].sort((a, b) => unitWeight(b) - unitWeight(a));
  for (const unit of sorted) {
    loads.sort((a, b) => score(a) - score(b) || String(a.checkInAt ?? "").localeCompare(String(b.checkInAt ?? "")));
    const chosen = loads[0];
    assignments[unit.id] = chosen.id;
    chosen.openPieces = Number(chosen.openPieces ?? 0) + 1;
    chosen.openValue = Number(chosen.openValue ?? 0) + Number(unit.value || 0);
  }

  return { assignments, assigned: sorted.length, employees: loads.length, message: "" };
}
