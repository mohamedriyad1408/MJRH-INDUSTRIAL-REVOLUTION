# ADR-022: Sovereign API Gateway and Webhook Protocol

## Status
Proposed

## Context
A modern enterprise must integrate with IoT sensors, payment gateways, and client ERPs. We need a way to expose the MJRH OS to the world without violating the Sovereign Isolation of Layer 1 or the Immutability of Layer 5.

## Decision
1.  **Node-Scoped API Keys:** API keys are not global. They are issued by a Sovereign Root for a specific Node (e.g., a specific Factory site or Bank branch).
2.  **Stateless Inbound Signals:** External requests do not "log in". They provide a signed payload. The Gateway verifies the signature, resolves the L1 Node Context, and maps the request to a Layer 4 Pulse.
3.  **Webhook Chaining:** We will implement an observer on `v4_l4.outbox_facts`. When a fact is emitted, the Webhook Dispatcher checks for external subscribers in `v4_l9.webhook_subscriptions` and pushes the data asynchronously.
4.  **Audit Enforcement:** Every Gateway interaction must produce a "Gateway Fact" in L5, including the external IP and Key ID.

## Technical Model
- **Key Vault:** `v4_l9.api_keys` (node_id, capability_id, secret_hash).
- **Subscribers:** `v4_l9.webhook_subscriptions` (node_id, event_type, target_url).

## Consequences
- **Positive:** Full decoupling of external integrations from core business logic.
- **Negative:** Additional latency for inbound mapping and outbound delivery.
