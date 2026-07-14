import React from "react";
import { AlertTriangle, FileText, Sparkles, Zap } from "lucide-react";

type Props = {
  order?: any | null;
  customer?: any | null;
  className?: string;
};

export function OmnipresentOrderBanner({ order, customer, className = "" }: Props) {
  const hasOrderNotes = order?.notes && order.notes.trim().length > 0;
  const hasCustomerNotes = customer?.notes && customer.notes.trim().length > 0;
  const vipPrefs = customer?.vip_preferences;
  const hasVipPrefs = vipPrefs && typeof vipPrefs === "object" && Object.keys(vipPrefs).length > 0;

  if (!hasOrderNotes && !hasCustomerNotes && !hasVipPrefs && !order?.is_urgent) {
    return null;
  }

  return (
    <div className={`rounded-xl border-2 border-amber-500/80 bg-amber-950/30 p-3.5 space-y-2 text-slate-100 shadow-lg ${className}`}>
      <div className="font-bold text-amber-400 text-xs md:text-sm flex items-center justify-between gap-1.5 border-b border-amber-800/50 pb-1.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>لوحة التنبيه الدائم لتفضيلات العميل والملاحظات التشغيلية (تظهر في كافة المحطات لمنع خسائر إعادة الكي والتغليف)</span>
        </div>
        {order?.is_urgent && (
          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[11px] font-black flex items-center gap-1 shrink-0">
            <Zap className="w-3 h-3" />
            أولوية مستعجلة
          </span>
        )}
      </div>
      
      {hasCustomerNotes && (
        <div className="text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-700">
          <span className="font-bold text-teal-400 block mb-0.5">ملاحظات العميل الدائمة في ملف التعريف:</span>
          <span className="text-white">{customer!.notes}</span>
        </div>
      )}

      {hasVipPrefs && (
        <div className="text-xs bg-teal-950/40 p-2 rounded-lg border border-teal-500/50">
          <span className="font-bold text-teal-300 block mb-0.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تفضيلات التغليف والتشغيل VIP الدائمة:</span>
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {Object.entries(vipPrefs!).map(([k, v]) => {
              if (v === false || v === null || v === "") return null;
              let label = `${k}: ${v}`;
              if (k === "packaging" && v === "hangers") label = "التغليف: شماعات معلقة إلزامي";
              if (k === "packaging" && v === "folded") label = "التغليف: مطوي في أكياس";
              if (k === "individual_bags" && v === true) label = "أكياس فردية لكل قطعة";
              if (k === "urgent_ironing" && v === "express") label = "كي مستعجل وفائق العناية";
              return (
                <span key={k} className="bg-teal-900/80 text-teal-200 px-2 py-0.5 rounded text-[11px] font-bold border border-teal-600">
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {hasOrderNotes && (
        <div className="text-xs bg-amber-950/60 p-2 rounded-lg border border-amber-600/60">
          <span className="font-bold text-amber-300 block mb-0.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>ملاحظات هذا الطلب المخصصة:</span>
          </span>
          <span className="text-amber-100 font-medium">{order!.notes}</span>
        </div>
      )}
    </div>
  );
}
