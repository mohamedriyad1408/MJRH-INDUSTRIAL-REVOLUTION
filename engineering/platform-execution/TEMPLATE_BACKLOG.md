# Template Backlog

**Rule:** Templates define only template work. Never Core work.

| Template | Template Work | Required Packs | Definition of Done | Risk |
|---|---|---|---|---|
| Laundry Template | station/work-area labels, laundry workflow defaults, curated service defaults, laundry document defaults, QC checklist labels. | Workflow, CRM, Field Service, Accounting, Notification, Document, Reporting. | generates Dry Tech-compatible behavior without hardcoding. | copying Dry Tech-specific catalog blindly. |
| Cleaning Template | service categories, recurring/field defaults, cleaning checklists. | Field Service, Scheduling, CRM, Accounting, Notifications. | cleaning org generated without Core changes. | overfitting to laundry. |
| Maintenance Template | asset/customer equipment fields, visit workflow, parts usage. | Asset, Field Service, Workflow, Inventory, Accounting. | maintenance org generated. | asset model gap. |
| Medical Lab Template | appointment/intake/sample/report defaults, compliance docs. | Healthcare, Appointment, Document, CRM, Accounting, Notification. | lab generated without Core changes. | compliance/privacy. |
| Restaurant Template | menu/product defaults, order/payment/delivery config. | Catalog, Inventory, Accounting, Field Service, CRM. | restaurant org generated. | POS assumptions. |
| Retail Template | product/inventory/sales defaults. | Product, Inventory, Accounting, CRM, Reporting. | retail org generated. | inventory maturity. |
| Warehouse Template | inventory movement, receiving/shipping/workflow defaults. | Inventory, Workflow, Field Service, Reporting. | warehouse org generated. | no customer order required. |
| Logistics Template | shipment/route/task defaults. | Field Service, Workflow, Asset, Notifications, Accounting. | logistics org generated. | route/event model. |
