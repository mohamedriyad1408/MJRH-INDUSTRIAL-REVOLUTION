# ADR-001: Hierarchical Tree vs Flat Tags

## Status
Accepted

## Context
We need a way to organize identities within the organization. We compared flat tagging (flexible but lacks structure) vs. a hierarchical tree.

## Decision
We chose a **Hierarchical Tree** model using a recursive parent-child relationship.

## Rationale
- Provides automatic "inheritance" patterns for governance and policy layers.
- Naturally represents the sovereign structure of enterprises (Holding > Region > Site).
- Materialized paths (ltree) allow for high-speed ancestry and descendant queries.

## Consequences
- Requires acyclicity enforcement.
- Structural changes require re-parenting logic.
