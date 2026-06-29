export function normalizeEgyptPhoneForWhatsApp(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.length === 10) return `20${digits}`;
  return digits;
}

export function whatsappLink(phone: string, message: string) {
  const normalized = normalizeEgyptPhoneForWhatsApp(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message || "")}`;
}
