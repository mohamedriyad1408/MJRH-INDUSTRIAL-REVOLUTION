# MJRH — Facts Sheet — Operational Evidence
**Date:** 2026-06-30 22:40 UTC  
**Project Ref:** `dngjfjrjddigqadlyain`  
**Production:** https://mjrh.vercel.app  
**Pitch:** https://mohamedriyad1408.github.io/MJRH-INDUSTRIAL-REVOLUTION/

## Repository Evidence
- typecheck: 0 errors | vitest: 28/28 | build: 13.04s | bundle gzip ~285KB
- `as any`: 0
- journal_entries: 95 / journal_lines: 190 — balanced
- Edge Functions deployed: admin-actions, ocr-payment-proof, whatsapp-send — 2026-06-30

## Operational Evidence
- **Tenant:** Dry Tech (`dry-tech`) — 2026-06-21 — is_active=true — **1 tenant**
- **Branches:** 2 — الفرع الرئيسي (24 orders, 5 safes) / فرع البنفسج (0 orders, 0 safes)
- **Customers:** 6 — **Employees:** 10 — **Profiles:** 12
- **Orders:** 24 total / 19 delivered / 3 cancelled / 1 ready / 1 packing — 11 last 7d
- **Revenue — FACTS:** GMV **12,549.00 EGP** | Delivered **11,339.00 EGP** | AOV **522.88 EGP**
- **First order:** 2026-06-21 18:10 UTC | **Last order:** 2026-06-30 09:13 UTC
- **Cash:** main safe الخزنة الرئيسية **50,903.40 EGP** — 58 cash_transactions — 10 daily_cash_closings
- **Quality:** QC checks 19 / pickup_requests 8 / service_units 134 / order_items 106 / operation_events 119 / client_error_logs 4

## Business Assumptions
| Metric | Claim | Reality |
|---|---|---|
| CAC | $1,200 | **ASSUMPTION — $0 paid to date** |
| NRR / Churn | <5%/mo implied | **NO DATA — cohort 9 days old** |
| Gross Margin | 88%+ | **PROJECTION — pending COGS audit** |
| Payback | 3 months | **FINANCIAL MODEL — NOT validated** |
| MRR $199/$399 | implied | **0 verified invoices — PRE-REVENUE PILOT** |
| AI / ML | “AI Laundry Advisor” | **ASPIRATIONAL — Phase 4 2027 — today rule-based Live Simulation** |
| Bank API / IoT | implied early | **NOT SHIPPED — Phase 2/3 roadmap** |

## Investor Q&A — Honest 2026-06-30
1. كم مغسلة؟ → **1 active: Dry Tech**
2. كم Order؟ → **24 total / 19 delivered**
3. Churn؟ → **Unknown — 9-day cohort**
4. CAC حقيقي؟ → **$0 paid — organic/founder-led**
5. دفع أحد $199/$399؟ → **No verified Stripe invoice — pre-revenue pilot**

---
*Source: `supabase db query --linked -o json` — project dngjfjrjddigqadlyain — 2026-06-30*
