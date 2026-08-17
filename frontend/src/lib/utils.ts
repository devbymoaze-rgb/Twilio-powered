import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name?: string) {
  if (!name) return "TP";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function contactName(contact?: {
  firstName?: string;
  lastName?: string;
  phone?: string;
} | null) {
  if (!contact) return "Unknown";
  const name = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
  return name || contact.phone || "Unknown";
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
