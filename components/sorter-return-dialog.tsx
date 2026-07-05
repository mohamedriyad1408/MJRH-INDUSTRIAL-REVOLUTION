import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RotateCcw, Loader2, AlertCircle } from "lucide-react";

type Props = {
  orderId: string;
  orderNumber?: number | string | null;
  tenantId?: string | null;
  onDone: () => void;
  trigger?: React.ReactNode;
};

const RETURN_REASONS = [
  "خطأ في تحديد مسار الغسيل (مائي بدلاً من جاف)",
  "عدم تطابق كود المارك مع القطعة الفعلية",
  "تعديل المسار التشغيلي بناءً على رغبة العميل أو كشف عيب جديد",
  "قطعة تحتاج فحص بقع إضافي قبل الدخول لمحطة التنظيف",
  "سبب آخر مخصص (يرجى التوضيح أدناه)",
];

export function SorterReturnDialog({ orderId, orderNumber, tenantId, onDone, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [customNote, setCustomNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fullReason = reason === RETURN_REASONS[4] ? customNote.trim() || "مرتجع فرز للتدقيق" : `${reason}${customNote ? ` — ${customNote.trim()}` : ""}`;
      
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("orders").update({ status: "received" }).eq("id", orderId),
        supabase.from("service_units").update({ status: "received", current_stage: "sorting", staff_notes: `[مرتجع فرز]: ${fullReason}` }).eq("order_id", orderId),
      ]);

      if (e1 || e2) {
        throw new Error(e1?.message || e2?.message || "فشل إرجاع الطلب");
      }

      await supabase.rpc("record_operation_event", {
        _process_key: "sorting_return",
        _process_name: "إرجاع الطلب لمحطة الفرز وإعادة التصنيف",
        _source_type: "order",
        _source_id: orderId,
        _branch_id: null,
        _cash_account_id: null,
        _report_bucket: "quality/sorting-returns",
        _requires_notification: true,
        _data: { tenant_id: tenantId || null, order_id: orderId, order_number: orderNumber, reason: fullReason },
        _output: { cash_impact: false, journal_required: false, appears_in_report: true }
      }).then(() => null);

      toast.success("تم إرجاع الطلب لمحطة الفرز بنجاح وإشعار المشرف بالسبب");
      setOpen(false);
      onDone();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تنفيذ المرتجع");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="border-red-500 text-red-400 bg-red-950/20 hover:bg-red-900/40 font-bold text-xs gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-red-400" />
            <span>مرتجع للفرز مع السبب</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-400" />
            <span>إرجاع الطلب #{orderNumber} لمحطة الفرز وإعادة التصنيف</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2 text-xs md:text-sm">
          <div className="bg-red-950/40 border border-red-500/50 p-3 rounded-xl flex items-start gap-2 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>سيتم نقل حالة الطلب وكافة قطعه مرة أخرى إلى محطة الفرز (Sorting Station) وتوثيق السبب في سجل الرقابة APDO.</span>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-300">اختر سبب الإرجاع الرئيسي:</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-slate-950 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                {RETURN_REASONS.map((r, i) => (
                  <SelectItem key={i} value={r} className="text-xs">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-bold text-slate-300">توضيح إضافي أو تعليمات لمشرف الفرز (اختياري):</Label>
            <Textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="اكتب أي تفاصيل إضافية عن القطعة التي تحتاج تدقيق..."
              className="bg-slate-950 border-slate-700 text-white text-xs h-20"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy} className="text-xs">إلغاء</Button>
            <Button type="submit" variant="destructive" disabled={busy} className="bg-red-600 hover:bg-red-500 font-bold text-xs gap-1.5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>اعتماد الإرجاع للفرز وتوثيق السبب</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
