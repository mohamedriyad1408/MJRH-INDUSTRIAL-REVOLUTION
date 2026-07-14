# MJRH V4 — Business Operating System (BOS)
## Strategic Architecture Blueprint

### 1. The Golden Rule
> "If it won't work for 100,000 employees across 10 countries, don't build it."

### 2. Layers Specification

#### Layer 1: Core Engine (Internal: /v4/core)
- **Identity & Org:** Multi-level tree (Holdings, Entities, Units).
- **Capability Registry:** Discovery service for installed business features.
- **Event Bus:** Centralized pub/sub for all system state changes.
- **Security:** RLS + Capability-based RBAC/ABAC.

#### Layer 2: Platform Services (Internal: /v4/platform)
- **Metadata Engine:** Generates UI and Validation from JSON descriptors.
- **Dynamic AI Proxy:** Context-aware LLM routing.
- **Global Search:** Multi-tenant vector & text search.

#### Layer 3: Capability Packs (Internal: /v4/capabilities)
- **FinancePack:** Universal Ledger, Tax, and Multi-currency.
- **OpsPack:** Generic Work Orders and Task Distribution.
- **PeoplePack:** HR, Attendance, and Performance.
- **AssetPack:** Inventory, Equipment, and Maintenance.

#### Layer 4: Industry Templates (Internal: /v4/templates)
- **Templates:** Configuration-only definitions (Laundry, Hotel, Clinic).
- **Custom Branding:** Theme and localized terminology mappings.

---

### 3. Reusable Assets from V3
- **Infrastructure:** Supabase/Postgres logic.
- **UI System:** Tailwind/Radix/Lucide patterns.
- **Logic:** Multi-currency formatting, I18n runtime.
- **Security:** RLS function patterns (can_access_tenant).
