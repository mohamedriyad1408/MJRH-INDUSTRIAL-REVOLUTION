import { Badge } from "@/components/ui/badge";
import { POS_CATEGORY_TABS } from "@/lib/dry-tech-catalog";
import { Sparkles, Shirt, Scissors, Globe } from "lucide-react";

export type ServiceTypeFilter = "all" | "both" | "ironing" | "cleaning";

type Props = {
  activeTab: string;
  onSelect: (id: string) => void;
  items: Array<{ category?: string; service_type?: string }>;
  compact?: boolean;
  activeServiceType?: ServiceTypeFilter;
  onSelectServiceType?: (type: ServiceTypeFilter) => void;
};

const SERVICE_TYPE_OPTIONS: Array<{ id: ServiceTypeFilter; label: string; icon: any; color: string }> = [
  { id: "all", label: "🌐 كافة الخدمات", icon: Globe, color: "from-slate-700 to-slate-800" },
  { id: "both", label: "✨ تنظيف وغسيل (Dry Clean)", icon: Sparkles, color: "from-blue-600 to-indigo-700" },
  { id: "ironing", label: "👔 كي فقط بالبخار (Steam Iron)", icon: Shirt, color: "from-purple-600 to-violet-800" },
  { id: "cleaning", label: "🪡 تصليحات ورَفْو (Alterations)", icon: Scissors, color: "from-amber-600 to-orange-700" },
];

export function PosCategoryTabs({
  activeTab,
  onSelect,
  items,
  compact = false,
  activeServiceType,
  onSelectServiceType,
}: Props) {
  // First, filter items by the selected main POS category
  const categoryFilteredItems = items.filter(
    (s) => activeTab === "all" || s.category === activeTab || (activeTab === "رجالي" && !s.category)
  );

  return (
    <div className="space-y-2.5">
      {/* Tier 1: Main POS Categories (Men's, Women's, Kids, Furnishings, Carpets, Delivery) */}
      <div
        className={`rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-3 shadow-xl border border-white/10 ${
          compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
        }`}
      >
        {POS_CATEGORY_TABS.map((tab) => {
          const active = activeTab === tab.id;
          // Count items matching this tab AND matching the active service type filter (if set)
          const count = items.filter((s) => {
            const matchesCat = tab.id === "all" || s.category === tab.id || (tab.id === "رجالي" && !s.category);
            const matchesType = !activeServiceType || activeServiceType === "all" || s.service_type === activeServiceType;
            return matchesCat && matchesType;
          }).length;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={`group relative rounded-2xl transition-all duration-200 flex items-center justify-between gap-2 border text-start ${
                compact ? "px-3 py-1.5" : "p-3"
              } ${
                active
                  ? "bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-500 text-slate-950 font-black shadow-lg shadow-teal-500/30 scale-[1.03] border-white/40 z-10"
                  : "bg-white/5 hover:bg-white/10 text-white/90 hover:text-white font-bold border-white/10 hover:border-white/25 active:scale-[0.98]"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base shrink-0">{tab.icon}</span>
                <span className={`truncate ${compact ? "text-xs font-black" : "text-xs sm:text-sm font-black"}`}>
                  {tab.label}
                </span>
              </div>
              <Badge
                className={`shrink-0 font-mono font-black ${
                  compact ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
                } ${
                  active
                    ? "bg-slate-950/20 text-slate-950 border-0"
                    : "bg-black/40 text-teal-300 border border-teal-500/30 group-hover:bg-black/60"
                }`}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Tier 2: Sub-filter between Cleaning (Dry Clean), Ironing Only, and Alterations */}
      {onSelectServiceType && (
        <div className="rounded-2xl bg-slate-950/90 p-2.5 border border-teal-500/40 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs font-black text-teal-300 px-2 flex items-center gap-1.5">
            <span>⚡ تصنيف فرعي داخل ({POS_CATEGORY_TABS.find((t) => t.id === activeTab)?.label || "الفئة"}):</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-end">
            {SERVICE_TYPE_OPTIONS.map((typeOption) => {
              const active = (activeServiceType || "all") === typeOption.id;
              const count = categoryFilteredItems.filter(
                (s) => typeOption.id === "all" || s.service_type === typeOption.id
              ).length;
              const Icon = typeOption.icon;

              return (
                <button
                  key={typeOption.id}
                  type="button"
                  onClick={() => onSelectServiceType(typeOption.id)}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 border ${
                    active
                      ? `bg-gradient-to-r ${typeOption.color} text-white shadow-md border-white/40 scale-[1.02]`
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeOption.label}</span>
                  <Badge
                    className={`text-[10px] px-1.5 py-0 font-mono ${
                      active ? "bg-white/20 text-white" : "bg-black/40 text-slate-300"
                    }`}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
