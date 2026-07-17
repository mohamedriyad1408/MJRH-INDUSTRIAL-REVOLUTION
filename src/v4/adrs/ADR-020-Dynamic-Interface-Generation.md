# ADR-020: Metadata-Driven Dynamic Interface Generation

## Status
Proposed

## Context
Traditional UI development for 100k+ employee enterprises with diverse business units is unsustainable. Every new value stream or department would require manual frontend changes. Layer 7 must automate UI projection to ensure scale and consistency.

## Decision
1.  **Interface as Projection:** UI is treated as a "Lens" over the OS. The frontend will fetch a **Metadata Bundle** (Node + Blueprint + Mandate + Readiness) and render the appropriate components.
2.  **Schema-First Forms:** Every `v4_l4.activity` will link to a `v4_l7.form_schema` (JSON Schema) that defines the required user inputs.
3.  **Mandate-Gated Actions:** UI buttons and state transitions will be automatically hidden or disabled if the Actor's `v4_l2.authorities` do not match the Activity's `mandate_required`.
4.  **Sovereign Theming:** Global UI attributes (colors, logos) are derived from the Sovereign Root node settings in Layer 1.

## Technical Model
- **Form Schemas:** `v4_l7.form_schemas` (activity_id, schema_json, validation_rules).
- **Interface Registry:** `v4_l7.interface_components` (component_key, meta_mapping).

## Consequences
- **Positive:** Rapid deployment of new business units without frontend code changes. Centralized control of organizational "look and feel".
- **Negative:** Increased initial complexity in building generic UI builders. Heavy reliance on JSON Schema validation performance.
