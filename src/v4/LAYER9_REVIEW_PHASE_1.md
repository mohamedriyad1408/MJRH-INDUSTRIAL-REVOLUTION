# Layer 9: Universal API Layer — Phase 1 Review

## Component: The Embassy / Gateway

### Accomplishments
1.  **Architecture:** Defined **Layer 9** as the secure boundary between the OS and the external world in `src/v4/LAYER9_CORE_SPEC.md`.
2.  **Standards:** Established **ADR-022** for Node-Scoped API Keys and Webhook Chaining, ensuring external access is always structural (L1) and capability-bound (L3).
3.  **Persistence:** Implemented `v4_l9` schema for `api_keys`, `webhook_subscriptions`, and logs.
4.  **Security:** Designed the "Emitted Fact to Webhook" flow to ensure zero-lag execution in the core OS.

### Cross-Layer Integrity
- **L1/L3 Binding:** API keys are physically anchored to a node and gated by specific business capabilities.
- **L4 Integration:** Inbound signals are automatically transformed into operational facts in the L4 outbox.
- **L5 Traceability:** Every gateway interaction is logged, maintaining the legal audit trail.

### Next Steps (Implementation Phase)
- Implement `trg_v4_l9_webhook_trigger` to push facts to external URLs.
- Build the `v4_l9.fn_v_verify_api_signature` for HMAC-based key security.
- Finalize Layer 9 Freeze.

Commit: [GATEWAY_LAYER_V1]. Review.
