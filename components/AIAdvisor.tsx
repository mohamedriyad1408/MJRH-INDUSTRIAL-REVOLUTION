import { useState, useEffect } from 'react';
import { getAIRecommendations } from '@/lib/ai-advisor';
import { useAuth } from '@/hooks/use-auth';
import { Brain, Sparkles, Loader2, Info } from 'lucide-react';

export function AIAdvisor() {
    const { tenantId } = useAuth();
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRecommendations = async () => {
            if (!tenantId) return;
            setLoading(true);
            const result = await getAIRecommendations(tenantId);
            setRecommendations(result);
            setLoading(false);
        };
        loadRecommendations();
    }, [tenantId]);

    if (loading) {
        return (
            <div className="p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                <p className="text-xs text-slate-500 font-medium">جاري استشارة الذكاء الاصطناعي...</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-5 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Brain className="w-24 h-24" />
            </div>
            
            <div className="relative flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-teal-200" />
                </div>
                <div>
                    <h3 className="font-black text-sm">AI Advisor</h3>
                    <p className="text-[10px] text-teal-100 opacity-80 uppercase tracking-widest font-bold">Smart Recommendations</p>
                </div>
            </div>

            <ul className="space-y-3 relative">
                {recommendations.length === 0 || recommendations[0]?.startsWith('⚠️') ? (
                    <li className="text-teal-50 text-xs font-medium flex items-center gap-2 bg-white/10 p-3 rounded-2xl">
                        <Info className="w-4 h-4" />
                        {recommendations[0] || 'لا توجد توصيات حالياً.'}
                    </li>
                ) : (
                    recommendations.map((rec, index) => (
                        <li key={index} className="text-xs font-bold leading-relaxed flex items-start gap-2 bg-white/10 p-3 rounded-2xl border border-white/5 hover:bg-white/15 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-300 mt-1.5 shrink-0" />
                            <span>{rec}</span>
                        </li>
                    ))
                )}
            </ul>
            
            <div className="mt-4 pt-3 border-t border-white/10 text-[9px] text-teal-200 font-bold flex justify-between items-center">
                <span>تحديث: {new Date().toLocaleTimeString('ar-EG')}</span>
                <span className="bg-teal-500/30 px-2 py-0.5 rounded-full">BETA 0.1</span>
            </div>
        </div>
    );
}
