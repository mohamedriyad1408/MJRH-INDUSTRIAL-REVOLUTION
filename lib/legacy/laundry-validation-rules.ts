// LEGACY — Laundry Validation Rules — isolated from generic engine
// This file contains GARMENT_PROFILES and all hardcoded laundry logic
// It must NOT be used for any tenant with workflow_engine_version = 'v2'
// For v2, use workflow-engine-v2.ts which reads from workflow_transitions DB

export type GarmentProfile = {
  code: string;
  nameKey: string;
  need_wash: boolean;
  need_dry: boolean;
  need_iron: boolean;
  need_dry_clean: boolean;
  need_qc: boolean;
  need_packaging: boolean;
  target_sla_mins: number;
  max_sla_mins: number;
};

export const GARMENT_PROFILES: Record<string, GarmentProfile> = {
  shirt: { code: "shirt", nameKey: "garment.shirt", need_wash: true, need_dry: true, need_iron: true, need_dry_clean: false, need_qc: true, need_packaging: true, target_sla_mins: 180, max_sla_mins: 360 },
  suit_blazer: { code: "suit_blazer", nameKey: "garment.suit_blazer", need_wash: false, need_dry: false, need_iron: true, need_dry_clean: true, need_qc: true, need_packaging: true, target_sla_mins: 240, max_sla_mins: 480 },
  suit_pants: { code: "suit_pants", nameKey: "garment.suit_pants", need_wash: false, need_dry: false, need_iron: true, need_dry_clean: true, need_qc: true, need_packaging: true, target_sla_mins: 240, max_sla_mins: 480 },
  dress: { code: "dress", nameKey: "garment.dress", need_wash: true, need_dry: true, need_iron: true, need_dry_clean: false, need_qc: true, need_packaging: true, target_sla_mins: 240, max_sla_mins: 480 },
  blanket: { code: "blanket", nameKey: "garment.blanket", need_wash: true, need_dry: true, need_iron: false, need_dry_clean: false, need_qc: true, need_packaging: true, target_sla_mins: 360, max_sla_mins: 720 },
  carpet: { code: "carpet", nameKey: "garment.carpet", need_wash: true, need_dry: true, need_iron: false, need_dry_clean: false, need_qc: true, need_packaging: true, target_sla_mins: 480, max_sla_mins: 960 },
};

// Hardcoded 7 stages validation (legacy) — DO NOT USE FOR v2
export const LEGACY_LAUNDRY_STAGES = [
  "reception",
  "cleaning",
  "drying_assembly",
  "ironing",
  "packing",
  "qc",
  "delivery",
] as const;

export function isLaundryStage(stage: string): boolean {
  return (LEGACY_LAUNDRY_STAGES as readonly string[]).includes(stage);
}

// Example of laundry-specific rule: "washing only skips ironing"
export function shouldSkipIroning(profile: GarmentProfile): boolean {
  return !profile.need_iron;
}

// This file is intentionally isolated — any new industry must NOT import from here
// For generic engine, import from @/lib/workflow-engine-v2
