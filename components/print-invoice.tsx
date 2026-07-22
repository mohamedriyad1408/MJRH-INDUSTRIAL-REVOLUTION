import { Button } from "@/components/ui/button";
import { Printer, FileText, Receipt } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";

type Order = {
  order_number: number;
  created_at: string;
  total: number;
  subtotal: number;
  notes?: string | null;
  customers?: { full_name: string; phone: string } | null;
  order_items?: { name: string; qty: number; unit_price: number; line_total: number }[];
};

export function PrintInvoiceButton({ order }: { order: Order }) {
  const { t, dir, language } = useI18n();
  const isAr = language === "ar";

  function print(type: "a4" | "thermal") {
    const items = (order.order_items ?? []).map((i) => {
      if (type === "thermal") {
        return `<tr>
          <td style="padding:4px 0;border-bottom:1px dashed #ccc;font-size:11px">${i.name}</td>
          <td style="padding:4px 0;border-bottom:1px dashed #ccc;font-size:11px;text-align:center">${i.qty}</td>
          <td style="padding:4px 0;border-bottom:1px dashed #ccc;font-size:11px;text-align:end">${i.line_total}</td>
        </tr>`;
      }
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${i.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:end">${i.unit_price}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:end">${i.line_total}</td>
      </tr>`;
    }).join("");

    const title = `${t("orders.invoiceTitle", "فاتورة #")}${order.order_number}`;
    const brand = "MJRH";
    const subBrand = t("app.subtitle", "نظام إدارة المغاسل");
    const customerLabel = order.customers?.full_name ?? "—";
    const phoneLabel = order.customers?.phone ?? "";
    const totalLabel = `${t("orders.total", "الإجمالي:")} ${order.total}`;
    const notesLabel = order.notes ? `<b>${t("orders.notes", "ملاحظات:")}</b> ${order.notes}` : "";
    const footerLabel = t("orders.invoiceFooter", "شكراً لثقتكم — MJRH | نظام إدارة المغاسل");

    let html = "";

    if (type === "thermal") {
      html = `<!DOCTYPE html><html dir="${dir}" lang="${language}"><head><meta charset="UTF-8"><title>${title}</title>
      <style>
        body { font-family: monospace, sans-serif; padding: 12px; color: #000; max-width: 280px; margin: 0 auto; font-size: 12px; line-height: 1.4; }
        h1 { font-size: 22px; font-weight: 900; text-align: center; margin: 0 0 4px 0; }
        h2 { font-size: 12px; text-align: center; color: #444; margin: 0 0 16px 0; border-bottom: 1px dashed #000; padding-bottom: 8px; }
        .meta { text-align: center; margin-bottom: 14px; font-size: 11px; }
        .meta-num { font-size: 16px; font-weight: 900; margin-bottom: 4px; }
        .customer { background: #f8f8f8; padding: 8px; margin-bottom: 14px; border: 1px dotted #000; font-size: 11px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px; text-align: start; }
        .total-container { border-top: 2px solid #000; margin-top: 12px; padding-top: 8px; text-align: end; font-size: 15px; font-weight: 900; }
        .notes { margin-top: 12px; padding: 8px; border: 1px dashed #000; font-size: 11px; }
        footer { margin-top: 24px; text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 12px; }
      </style></head>
      <body>
        <h1>${brand}</h1>
        <h2>${subBrand}</h2>
        <div class="meta">
          <div class="meta-num">${title}</div>
          <div>${new Date(order.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</div>
        </div>
        <div class="customer">
          <div style="font-weight:700">${customerLabel}</div>
          <div>${phoneLabel}</div>
        </div>
        <table>
          <thead><tr>
            <th>${t("common.service", "الخدمة")}</th>
            <th style="text-align:center">${t("common.qty", "الكمية")}</th>
            <th style="text-align:end">${t("common.total", "الإجمالي")}</th>
          </tr></thead>
          <tbody>${items || `<tr><td colspan='3' style='padding:16px;text-align:center'>${t("common.noItems", "لا توجد بنود")}</td></tr>`}</tbody>
        </table>
        <div class="total-container">${totalLabel}</div>
        ${order.notes ? `<div class="notes">${notesLabel}</div>` : ""}
        <footer>${footerLabel}</footer>
      </body></html>`;
    } else {
      html = `<!DOCTYPE html><html dir="${dir}" lang="${language}"><head><meta charset="UTF-8"><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 28px; font-weight: 900; color: #0d9488; margin: 0; }
        h2 { font-size: 14px; color: #64748b; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f1f5f9; padding: 8px; text-align: start; font-size: 12px; }
        td { font-size: 13px; }
        .total { font-size: 18px; font-weight: 900; color: #0d9488; }
        footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; }
      </style></head>
      <body>
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:24px">
        <div><h1>${brand}</h1><h2>${subBrand}</h2></div>
        <div style="text-align:end"><div style="font-size:22px;font-weight:900">${title}</div><div style="color:#64748b;font-size:12px">${new Date(order.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</div></div>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <div style="font-weight:700">${customerLabel}</div>
        <div style="color:#64748b;font-size:13px">${phoneLabel}</div>
      </div>
      <table>
        <thead><tr>
          <th>${t("common.service", "الخدمة")}</th>
          <th style="text-align:center">${t("common.qty", "الكمية")}</th>
          <th style="text-align:end">${t("common.unitPrice", "سعر الوحدة")}</th>
          <th style="text-align:end">${t("common.total", "الإجمالي")}</th>
        </tr></thead>
        <tbody>${items || `<tr><td colspan='4' style='padding:16px;text-align:center;color:#94a3b8'>${t("common.noItems", "لا توجد بنود")}</td></tr>`}</tbody>
      </table>
      <div style="border-top:2px solid #0d9488;margin-top:16px;padding-top:12px;text-align:end"><span class="total">${totalLabel}</span></div>
      ${order.notes ? `<div style="margin-top:16px;background:#fffbeb;border-radius:8px;padding:10px 14px;font-size:13px">${notesLabel}</div>` : ""}
      <footer>${footerLabel}</footer>
      </body></html>`;
    }

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Printer className="w-4 h-4 ms-1" /> {t("orders.printInvoice", "طباعة الفاتورة")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => print("a4")}>
          <FileText className="w-4 h-4 me-2" />
          {t("orders.printA4", "طباعة فاتورة A4")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => print("thermal")}>
          <Receipt className="w-4 h-4 me-2" />
          {t("orders.printThermal", "إيصال حراري 80mm")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
