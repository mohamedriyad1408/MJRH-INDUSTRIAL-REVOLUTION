import { Card, CardContent } from "@/components/ui/card";

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 text-sm border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
