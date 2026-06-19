import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NextTask {
  unitId: string;
  unitLabel: string;          // from tenant_vertical_config.unit_label_ar
  unitCode: string;           // QR code display
  orderNumber: number;
  customerName: string;
  isUrgent?: boolean;
  waitingMinutes?: number;    // how long it's been waiting
  action: "scan_in" | "scan_out";
  actionLabel: string;        // from tone_dictionary
  onAction: () => void;
}

interface NextTaskCardProps {
  task: NextTask | null;
  loading?: boolean;
  emptyLabel?: string;
}

export function NextTaskCard({ task, loading, emptyLabel = "لا توجد مهام في الانتظار — أحسنت! ✅" }: NextTaskCardProps) {
  if (loading) return (
    <Card className="border-dashed">
      <CardContent className="p-4 text-center text-sm text-muted-foreground">جاري التحميل...</CardContent>
    </Card>
  );

  if (!task) return (
    <Card className="border-dashed border-emerald-300 bg-emerald-50/40">
      <CardContent className="p-4 flex items-center gap-2 text-emerald-700 font-medium text-sm">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        {emptyLabel}
      </CardContent>
    </Card>
  );

  return (
    <Card className={cn(
      "border-2 transition-all",
      task.isUrgent ? "border-amber-400 bg-amber-50/30" : "border-teal-400 bg-teal-50/30"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">المهمة التالية</p>
            <p className="font-black text-base mt-0.5">{task.unitLabel} — {task.unitCode}</p>
            <p className="text-sm text-muted-foreground">طلب #{task.orderNumber} · {task.customerName}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {task.isUrgent && <Badge className="bg-amber-500 text-white text-xs">⚡ عاجل</Badge>}
            {task.waitingMinutes && task.waitingMinutes > 30 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                انتظر {task.waitingMinutes}د
              </Badge>
            )}
          </div>
        </div>
        <Button
          onClick={task.onAction}
          className={cn("w-full font-bold", task.isUrgent ? "bg-amber-500 hover:bg-amber-600" : "bg-teal-600 hover:bg-teal-700")}
        >
          <QrCode className="w-4 h-4 ms-2" />
          {task.actionLabel}
          <ArrowLeft className="w-4 h-4 me-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
