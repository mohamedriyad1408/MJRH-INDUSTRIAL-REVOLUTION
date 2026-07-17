import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Compass, 
  Zap, 
  AlertCircle, 
  Languages, 
  LogOut,
  Settings,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";

/**
 * MJRH V4 — Sovereign Command Center
 * The ultimate projection of the Enterprise Digital Twin.
 */
export default function SovereignCommandCenter() {
  const queryClient = useQueryClient();

  // 1. Fetch the All-in-One Cockpit Data
  const { data: cockpit, isLoading, error } = useQuery({
    queryKey: ['v4-cockpit'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_get_personal_cockpit');
      if (error) throw error;
      return data;
    }
  });

  // 2. Language Mutation
  const setLanguage = useMutation({
    mutationFn: async (lang: string) => {
      const { error } = await supabase.rpc('rpc_update_user_language', { _lang: lang });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v4-cockpit'] });
      toast.success(cockpit?.actor?.lang === 'ar' ? 'تم تحديث اللغة' : 'Language Updated');
    }
  });

  if (isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-red-500 font-black animate-pulse">MJRH CORE INITIALIZING...</div>;
  if (error) return <div className="p-8 text-red-500">Access Denied: Sovereign Context Required.</div>;

  const { identity, actor, tasks, alerts, strategic_compass, fleet_status } = cockpit;
  const isAr = actor?.lang === 'ar';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-red-500/30" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 1. TOP BAR */}
      <header className="h-20 border-b border-slate-800/60 flex items-center justify-between px-8 sticky top-0 bg-[#020617]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-red-900/20">M</div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none text-white">{identity?.name}</h1>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{identity?.urn}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-white">{actor?.full_name}</span>
            <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold italic">
              {actor?.is_manager ? (isAr ? 'مدير سيادي' : 'Sovereign Manager') : (isAr ? 'فاعل تشغيلي' : 'Operational Actor')}
            </span>
          </div>
          
          <button 
            onClick={() => setLanguage.mutate(isAr ? 'en' : 'ar')}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <Languages className="w-5 h-5" />
          </button>
          
          <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto">
        
        {/* 2. LEFT SIDE: TO-DO LIST (L4) */}
        <aside className="lg:col-span-3 space-y-6">
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <CheckSquare className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
                {isAr ? 'قائمة المهام' : 'Task Queue'}
              </h2>
            </div>
            
            <div className="space-y-3">
              {tasks?.length > 0 ? tasks.map((task: any) => (
                <div key={task.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-red-500/40 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded uppercase tracking-tighter">
                      {task.status}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-white">{task.activity_name}</p>
                  <p className="text-[9px] text-slate-600 font-mono mt-1 uppercase">ID: {task.id.slice(0,8)}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-600 italic">{isAr ? 'لا توجد مهام عالقة' : 'Clear queue'}</p>
              )}
            </div>
          </section>

          <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
                {isAr ? 'الوعي اللحظي' : 'System Intel'}
              </h2>
            </div>
            <div className="space-y-4">
              {alerts?.map((alert: any, i: number) => (
                <div key={i} className="border-r-2 border-blue-500 pr-3 py-1">
                  <p className="text-xs font-bold text-white">{alert.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{alert.body}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* 3. MIDDLE: STRATEGIC HEART (L10 & OIO) */}
        <main className="lg:col-span-6 space-y-8">
          
          {/* OIO CARD */}
          <section className="bg-gradient-to-br from-red-600 to-red-900 p-8 rounded-[2.5rem] shadow-2xl shadow-red-950/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Compass className="w-6 h-6 text-white" />
                <h2 className="text-sm font-black uppercase tracking-widest text-white/80">
                  {isAr ? 'القائد السيادي (OIO)' : 'Sovereign Intelligence'}
                </h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-black/20 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                  <p className="text-lg font-black text-white leading-tight">
                    {isAr ? 'اقتراح: زيادة كفاءة التشغيل بنسبة ٥٪' : 'Insight: Optimization proposal +5% efficiency'}
                  </p>
                  <p className="text-sm text-white/70 mt-2">
                    {isAr ? 'بناءً على تحليل L5، تم اكتشاف تأخير في محطة الكي. الضغط الحالي يتطلب تحويل فوري للموارد.' : 'Based on L5 logs, a bottleneck was detected in Ironing. Current surge requires instant reallocation.'}
                  </p>
                  <button className="mt-6 bg-white text-red-600 px-8 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl">
                    {isAr ? 'تطبيق التعديل الجيني' : 'Inject DNA Mutation'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* DASHBOARD CHARTS (MOCKING L6 TRENDS) */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 h-64 flex flex-col items-center justify-center text-center">
              <Activity className="w-8 h-8 text-green-500 mb-4 opacity-50" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isAr ? 'الإنتاجية اللحظية' : 'Live Productivity'}</p>
              <p className="text-3xl font-black text-white mt-2">92%</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 h-64 flex flex-col items-center justify-center text-center">
              <Zap className="w-8 h-8 text-yellow-500 mb-4 opacity-50" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{isAr ? 'الالتزام بالـ SLA' : 'SLA Compliance'}</p>
              <p className="text-3xl font-black text-white mt-2">100%</p>
            </div>
          </div>

          <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">{isAr ? 'البوصلة الاستراتيجية' : 'Strategic Compass'}</h2>
            <div className="space-y-4">
              {strategic_compass?.map((goal: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-white">{goal.goal}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-1">{goal.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-500">{goal.current}%</p>
                    <p className="text-[9px] text-slate-600">Target: {goal.target}%</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* 4. RIGHT SIDE: RESOURCES (L3) */}
        <aside className="lg:col-span-3 space-y-6">
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
                {isAr ? 'حالة الموارد' : 'Resource Health'}
              </h2>
            </div>
            
            <div className="space-y-4">
              {fleet_status?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono underline decoration-slate-800">{item.metric}</span>
                  <span className="text-white font-bold">{item.value}</span>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-800">
                <button className="w-full text-[10px] font-black text-blue-400 hover:text-white transition-colors uppercase tracking-widest">
                  {isAr ? 'عرض الأسطول بالكامل' : 'View Full Fleet'}
                </button>
              </div>
            </div>
          </section>
        </aside>

      </div>
    </div>
  );
}
