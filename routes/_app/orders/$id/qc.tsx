import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { updateOrderQC } from "@/lib/orders-api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/orders/$id/qc")({
  component: QCPage,
});

function QCPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const handleQC = async (status: "PASSED" | "FAILED") => {
    if (!tenantId) return toast.error("Tenant ID missing");
    setLoading(true);
    const result = await updateOrderQC(id!, status, tenantId, notes);
    setLoading(false);
    if (result.success) {
      toast.success(t("qc.success", `تم ${status === "PASSED" ? "اجتياز" : "فشل"} فحص الجودة بنجاح`));
      navigate({ to: `/orders/${id}` });
    } else {
      toast.error(t("qc.error", `فشل فحص الجودة: ${result.error}`));
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
             {t("common.qcNotes", "فحص الجودة")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground font-mono text-xs">{t("orders.id", "معرف الطلب")}: {id}</p>

          <div className="space-y-2">
            <label className="text-sm font-bold">{t("common.qcNotes", "ملاحظات الفحص")}</label>
            <Textarea
              className="w-full"
              placeholder={t("qc.notesPlaceholder", "ملاحظات اختيارية عن حالة الملابس بعد التشغيل...")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => handleQC("PASSED")}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <CheckCircle2 className="w-4 h-4 ms-2" />}
              {t("qc.pass", "اجتياز (Passed)")}
            </Button>
            <Button
              onClick={() => handleQC("FAILED")}
              disabled={loading}
              variant="destructive"
              className="flex-1 font-black"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : <XCircle className="w-4 h-4 ms-2" />}
              {t("qc.fail", "فشل (Failed)")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
