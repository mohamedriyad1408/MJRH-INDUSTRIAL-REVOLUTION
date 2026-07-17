# MJRH V4 — Industrial Laundry DNA v1.0
## Industry-Specific Metadata Configuration

### 1. Governance Matrix (L2)
| Job Code | Mandate Class | Responsibility |
| :--- | :--- | :--- |
| `LDR_INTAKE` | `OPERATIONAL_ENTRY` | Accepting work from customers |
| `LDR_TECH` | `OPERATIONAL_EXEC` | Cleaning and Ironing operations |
| `LDR_QC` | `OPERATIONAL_AUDIT` | Quality assurance and rejection |
| `LDR_LOGISTICS` | `OPERATIONAL_EXIT` | Packing and Dispatch |

### 2. Value Stream: "INDUSTRIAL_CORE" (L4)
1. **Intake:** Creating the Work Order.
2. **Sorting:** Categorizing by fabric type (Requires L3 Capability: `fabric_knowledge`).
3. **Cleaning:** Industrial washing (Requires L3 Resource: `washing_machine`).
4. **Ironing:** Steam pressing (Requires L3 Resource: `steam_press`).
5. **Quality Control:** Visual inspection.
6. **Packing:** Final bagging and tagging.

### 3. SLA Targets (L6)
- **Cleaning:** 180 mins max.
- **Ironing:** 60 mins max.
- **QC:** 15 mins max.

### 4. UI Projections (L7)
- **Intake Form:** `{"fields": ["customer_urn", "piece_count", "priority"]}`
- **QC Form:** `{"fields": ["visual_check", "stain_free", "rejection_reason"]}`
