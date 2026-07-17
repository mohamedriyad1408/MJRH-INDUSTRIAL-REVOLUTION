const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9_]+/g,
  /sbp_[A-Za-z0-9_]+/g,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /postgresql:\/\/[^\s]+/g,
  /service_role[^\s]*/gi,
];

export function sanitizeErrorText(input: unknown, max = 1000) {
  let text = input instanceof Error ? input.message : String(input ?? "Unknown error");
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, "[redacted]");
  return text.slice(0, max);
}

export function sanitizeStack(input: unknown, max = 6000) {
  let text = input instanceof Error ? (input.stack ?? input.message) : String(input ?? "");
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, "[redacted]");
  return text.slice(0, max);
}
