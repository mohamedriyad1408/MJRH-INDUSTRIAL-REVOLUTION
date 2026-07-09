import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES, type CurrencyCode } from "@/lib/format";

type CurrencyCtx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** The tenant's saved currency from app_settings */
  tenantCurrency: CurrencyCode;
};

const Ctx = createContext<CurrencyCtx>({
  currency: "EGP",
  setCurrency: () => {},
  tenantCurrency: "EGP",
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useAuth();
  const [tenantCurrency, setTenantCurrency] = useState<CurrencyCode>("EGP");
  const [currency, setCurrency] = useState<CurrencyCode>("EGP");

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("app_settings")
      .select("currency")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }: any) => {
        const code = (data?.currency || "EGP").toUpperCase() as CurrencyCode;
        if (CURRENCIES[code]) {
          setTenantCurrency(code);
          setCurrency(code);
        }
      });
  }, [tenantId]);

  return (
    <Ctx.Provider value={{ currency, setCurrency, tenantCurrency }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCurrency() {
  return useContext(Ctx);
}
