import { useState, useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export function UnifiedSearch() {
  const { t } = useI18n();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with URL if we are on /search
  useEffect(() => {
    if (typeof window !== "undefined" && pathname.includes("/search")) {
      const q = new URLSearchParams(window.location.search).get("q") || "";
      setQuery(q);
    }
  }, [pathname]);

  // Keyboard shortcuts (Ctrl+K orK or /) to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const trigger = isMac ? e.metaKey : e.ctrlKey;
      
      if (trigger && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        if (!pathname.includes("/search")) {
          nav({ to: "/search", search: (query.trim() ? { q: query.trim() } : {}) as any } as any);
        }
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
        if (!pathname.includes("/search")) {
          nav({ to: "/search", search: (query.trim() ? { q: query.trim() } : {}) as any } as any);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pathname, nav, query]);

  const handleSearch = (q: string) => {
    const clean = q.trim();
    if (pathname.includes("/search")) {
      window.history.replaceState({}, "", `/search${clean ? `?q=${encodeURIComponent(clean)}` : ""}`);
      window.dispatchEvent(new Event("popstate"));
      // Trigger a custom event so SearchPage can listen without full router reload
      window.dispatchEvent(new CustomEvent("mjrh-search-update", { detail: clean }));
    } else {
      nav({ to: "/search", search: (clean ? { q: clean } : {}) as any } as any);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(query);
    }
  };

  return (
    <div className="relative w-64 md:w-80 shrink-0">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-teal-600 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (pathname.includes("/search")) {
              handleSearch(v);
            }
          }}
          onFocus={() => {
            if (!pathname.includes("/search")) {
              nav({ to: "/search", search: (query.trim() ? { q: query.trim() } : {}) as any } as any);
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={t("search.placeholder", "بحث موحد سريع (هاتف، QR، طلب)...")}
          aria-label={t("search.openAria", "فتح البحث الموحد والنتائج")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-9 w-full rounded-xl bg-slate-50 border-slate-200 ps-9 pe-16 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 font-medium text-slate-800"
        />

        {/* Keyboard hint */}
        {!query && (
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 border absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none">
            {typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "K" : "Ctrl+K"}
          </kbd>
        )}

        {/* Clear button */}
        {query && (
          <div className="absolute end-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button 
              type="button"
              onClick={() => {
                setQuery("");
                if (pathname.includes("/search")) handleSearch("");
              }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
