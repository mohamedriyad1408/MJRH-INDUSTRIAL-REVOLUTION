import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type Order = { order_number: number; created_at: string; total: number; subtotal: number; notes?: string | null; customers?: { full_name: string; phone: string } | null; order_items?: { name: string; qty: number; unit_price: number; line_total: number }[] };

export function PrintInvoiceButton({ order }: { order: Order }) {
  function print() {
    const items = (order.order_items ?? []).map((i) =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${i.qty}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:end">${i.unit_price} ج.م</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:end">${i.line_total} ج.م</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>فاتورة #${order.order_number}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a;max-width:600px;margin:0 auto}h1{font-size:28px;font-weight:900;color:#0d9488}h2{font-size:14px;color:#64748b;margin:0}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f1f5f9;padding:8px;text-align:start;font-size:12px}td{font-size:13px}.total{font-size:18px;font-weight:900;color:#0d9488}footer{margin-top:40px;text-align:center;color:#94a3b8;font-size:11px}</style></head>
    <body>
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:24px">
      <div><h1>MJRH</h1><h2>نظام إدارة المغاسل</h2></div>
      <div style="text-align:end"><div style="font-size:22px;font-weight:900">فاتورة #${order.order_number}</div><div style="color:#64748b;font-size:12px">${new Date(order.created_at).toLocaleDateString("ar-EG")}</div></div>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:20px">
      <div style="font-weight:700">${order.customers?.full_name ?? "—"}</div>
      <div style="color:#64748b;font-size:13px">${order.customers?.phone ?? ""}</div>
    </div>
    <table><thead><tr><th>الخدمة</th><th style="text-align:center">الكمية</th><th style="text-align:end">سعر الوحدة</th><th style="text-align:end">الإجمالي</th></tr></thead><tbody>${items || "<tr><td colspan='4' style='padding:16px;text-align:center;color:#94a3b8'>لا توجد بنود</td></tr>"}</tbody></table>
    <div style="border-top:2px solid #0d9488;margin-top:16px;padding-top:12px;text-align:end"><span class="total">الإجمالي: ${order.total} ج.م</span></div>
    ${order.notes ? `<div style="margin-top:16px;background:#fffbeb;border-radius:8px;padding:10px 14px;font-size:13px"><b>ملاحظات:</b> ${order.notes}</div>` : ""}
    <footer>شكراً لثقتكم — MJRH | نظام إدارة المغاسل</footer>
    </body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  return (
    <Button size="sm" variant="outline" onClick={print}>
      <Printer className="w-4 h-4 ms-1" /> طباعة الفاتورة
    </Button>
  );
}
