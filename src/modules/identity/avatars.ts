export const avatarPresets = [
  { id: "spade", label: "Spade", icon: "spade", gradient: "from-[#34d399] to-[#065f46]" },
  { id: "crown", label: "Crown", icon: "crown", gradient: "from-[#f6c76b] to-[#7a4f14]" },
  { id: "comet", label: "Comet", icon: "comet", gradient: "from-[#60a5fa] to-[#1e3a8a]" },
  { id: "gem", label: "Gem", icon: "gem", gradient: "from-[#5eead4] to-[#115e59]" },
  { id: "flame", label: "Flame", icon: "flame", gradient: "from-[#fb923c] to-[#7c2d12]" },
  { id: "bolt", label: "Bolt", icon: "bolt", gradient: "from-[#c4b5fd] to-[#4c1d95]" },
  { id: "rose", label: "Rose", icon: "rose", gradient: "from-[#f9a8d4] to-[#831843]" },
  { id: "moon", label: "Moon", icon: "moon", gradient: "from-[#a5b4fc] to-[#312e81]" },
] as const;

export type AvatarPreset = (typeof avatarPresets)[number]["id"];

const presetIds = new Set<string>(avatarPresets.map((preset) => preset.id));

export function isAvatarPreset(value: string): value is AvatarPreset {
  return presetIds.has(value);
}

export const defaultAvatarPreset: AvatarPreset = "spade";

export function toAvatarPreset(value: string | null | undefined): AvatarPreset {
  return value && isAvatarPreset(value) ? value : defaultAvatarPreset;
}
