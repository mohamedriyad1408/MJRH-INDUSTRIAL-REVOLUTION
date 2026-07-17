import { LensGate } from "@/v4/core/l7/LensGate";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";

/**
 * i18n Verification Hook for V4 Lens
 * Ensures metadata labels are resolved based on current active language.
 */
export function useSovereignI18n(workOrderId?: string) {
  const { language } = useI18n();
  const [context, setContext] = useState<any>(null);

  useEffect(() => {
    LensGate.getAppContext(workOrderId).then((ctx) => {
      // Resolve localized labels from the metadata bundle
      const localizedNav = ctx.navigation.map((item: any) => ({
        ...item,
        display_name: item.ui_config?.i18n?.[language]?.label || item.activity_name
      }));
      
      setContext({ ...ctx, navigation: localizedNav });
    });
  }, [language, workOrderId]);

  return context;
}
