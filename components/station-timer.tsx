import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function StationTimer({ enteredAt, warnAfterMinutes = 60 }: { enteredAt: string; warnAfterMinutes?: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calc = () => setElapsed(Math.floor((Date.now() - new Date(enteredAt).getTime()) / 1000));
    calc();
    const t = setInterval(calc, 30_000);
    return () => clearInterval(t);
  }, [enteredAt]);

  const minutes = Math.floor(elapsed / 60);
  const hours = Math.floor(minutes / 60);
  const displayMin = minutes % 60;
  const isLate = minutes >= warnAfterMinutes;

  return (
    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isLate ? "bg-red-100 text-red-700 animate-pulse" : "bg-slate-100 text-slate-600"}`}>
      <Clock className="w-3 h-3" />
      {hours > 0 ? `${hours}س ${displayMin}د` : `${minutes}د`}
      {isLate && ""}
    </div>
  );
}
