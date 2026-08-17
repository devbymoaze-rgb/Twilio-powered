export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

export function isStopKeyword(body: string): boolean {
  const value = body.trim().toUpperCase();
  return ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(value);
}

export function isHelpKeyword(body: string): boolean {
  const value = body.trim().toUpperCase();
  return ["HELP", "INFO"].includes(value);
}

export function isStartKeyword(body: string): boolean {
  const value = body.trim().toUpperCase();
  return ["START", "YES", "UNSTOP"].includes(value);
}
