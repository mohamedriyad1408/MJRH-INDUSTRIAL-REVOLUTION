import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveAppUrl(url?: string | null): string {
  if (!url) return "/";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("tel:") || url.startsWith("mailto:")) return url;
  let slug = "dry-tech";
  if (typeof window !== "undefined") {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length > 0 && !["login", "admin", "customer-portal", "track", "privacy", "terms", "reset-password", "join"].includes(parts[0])) {
      slug = parts[0];
    }
  }
  if (url === `/${slug}` || url.startsWith(`/${slug}/`)) return url;
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `/${slug}${cleanUrl}`;
}
