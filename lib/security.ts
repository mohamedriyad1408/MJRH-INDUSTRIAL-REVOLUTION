/**
 * Security hardening utilities for MJRH.
 * Input validation, rate limiting, and sanitization helpers.
 */

import { z } from "zod";

// ── Input Validation Schemas ────────────────────────────────────────

export const emailSchema = z.string().email("البريد الإلكتروني غير صحيح");
export const phoneSchema = z.string().min(11, "رقم الهاتف يجب أن يكون 11 رقم على الأقل").max(15);
export const passwordSchema = z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
export const slugSchema = z
  .string()
  .min(2, "الرابط قصير جداً")
  .max(40, "الرابط طويل جداً")
  .regex(/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط");

export const moneySchema = z.number().min(0, "المبلغ لا يمكن أن يكون سالباً").max(999999999, "المبلغ كبير جداً");
export const quantitySchema = z.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل").max(9999, "الكمية كبيرة جداً");

export const newCustomerSchema = z.object({
  full_name: z.string().min(1, "اسم العميل مطلوب").max(200),
  phone: phoneSchema,
  address: z.string().max(500).optional(),
});

export const newOrderSchema = z.object({
  customer_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  order_type: z.enum(["walk_in", "delivery"]),
  notes: z.string().max(1000).optional(),
});

// ── Rate Limiting (Client-Side) ─────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple client-side rate limiter.
 * Returns true if the action is allowed, false if rate-limited.
 */
export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) return false;

  entry.count++;
  return true;
}

// ── Sanitization ────────────────────────────────────────────────────

/** Strip HTML tags from user input */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/** Sanitize a search query */
export function sanitizeSearchQuery(q: string): string {
  return q.trim().replace(/[<>\"'`;(){}]/g, "").slice(0, 200);
}

/** Validate and sanitize a URL */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

// ── Content Security Policy ─────────────────────────────────────────

/**
 * CSP header value for production.
 * Note: This is informational — actual CSP should be set in Vercel headers.
 */
export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite needs unsafe-inline/eval for dev
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ocr.space",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
