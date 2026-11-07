import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function newRequestKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return `${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
}

export function initials(name: string) {
  return name
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

export function avatarTone(seed: string) {
  const tones = [
    "from-[#00e701]/70 to-[#006f2a]",
    "from-[#4ea5ff]/70 to-[#1a4c8a]",
    "from-[#a879ff]/70 to-[#4f2c8a]",
    "from-[#ff6ea9]/70 to-[#8a244f]",
    "from-[#ffb800]/70 to-[#8a5f00]",
    "from-[#ff6b4a]/70 to-[#8a2f1a]",
  ];
  const hash = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return tones[hash % tones.length];
}
