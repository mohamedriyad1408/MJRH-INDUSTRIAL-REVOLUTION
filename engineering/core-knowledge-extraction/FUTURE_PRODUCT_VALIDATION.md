# Future Product Validation

**Status:** Documentation only

This document checks whether the extracted architecture can support future businesses without changing Core.

## Validation Rule

If supporting a new business requires changing Core, explain why. Otherwise, the business should be generated from Operating Model + Business DNA + Capability Packs + Template.

| Business Type | Operating Model | Required Capability Packs | Core Change Required? | Notes |
|---|---|---|---|---|
| Laundry | Service + Workflow + Field + Inventory + QC | Workflow, CRM, Accounting, Field Service, Notification, Document, Reporting | No | Dry Tech proves data path; behavior packs incomplete. |
| Cleaning Company | Service + Field + Scheduling + Recurring | Field Service, Scheduling, CRM, Accounting, Notification, Reporting | No | Similar to Laundry but fewer station-specific stages. |
| Maintenance Company | Service + Field + Asset + Work Orders | Field Service, Asset Management, Workflow, CRM, Accounting, Document | No | Requires strong Asset + Work Order model. |
| Medical Lab | Service + Appointment + Compliance + Documents + QC | Healthcare, Appointment, Document, CRM, Accounting, Notification, Reporting | No, if Healthcare Pack is configuration | Requires strict permissions and documents. |
| Clinic | Appointment + Service + Documents + Compliance | Appointment, Healthcare, CRM, Document, Accounting, Notification | No | Patient can be modeled as Customer with Healthcare Pack fields. |
| Manufacturing | Production + Inventory + Workflow + QC + Assets | Manufacturing, Inventory, Workflow, Asset, Accounting, Reporting | No, if production Work Orders are generic | Requires Product/BOM concepts in packs, not Core special-case. |
| Restaurant | Product/Service + Orders + Inventory + Delivery | Catalog, Inventory, Order, Field Service, Accounting, Notification | No | POS behavior should be a pack/template, not Core. |
| Retail | Product + Inventory + Sales + CRM | Product Catalog, Inventory, Accounting, CRM, Reporting | No | Workflows optional. |
| Warehouse | Inventory + Field/Internal Operations + Assets | Inventory, Asset, Workflow, Reporting, Notifications | No | Customer orders optional. |
| Logistics | Field + Workflow + Assets + Notifications | Field Service, Asset, Workflow, Notification, Accounting | No | Shipment is Work Order/Order configuration. |
| Home Services | Field + Appointment + Service + CRM | Field Service, Appointment, CRM, Accounting, Notification | No | Strong scheduling and route needs. |
| Construction | Project + Workflow + Assets + Inventory + Approvals | Workflow, Project/Work Order, Asset, Inventory, Document, Approval, Accounting | No, if Project Pack is added | Long-running milestones are pack behavior. |

## Findings

- The Core should not change for any listed business if Work Orders, Tasks, Documents, Finance, Notifications, and Permissions are truly generic.
- Missing/weak areas are Capability Packs, not Core concepts.
- Manufacturing may require Product/BOM modeling, but this should be a Capability Pack or Product/Inventory extension, not industry-specific Core.
- Healthcare requires compliance and restricted forms, but these can be pack configuration if permission/document engines are strong.

## Conclusion

The architecture can support the listed business types without changing Core, provided Sprint 1+ implements:

1. capability pack registry/assets
2. role-aware generated navigation
3. Work Order/Task bridge
4. generic document/report/notification models
5. Business Initialization based on Operating Model + DNA
