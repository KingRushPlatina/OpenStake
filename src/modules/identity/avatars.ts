export const avatarPresets = [
  { id: "chad", label: "Chad", emoji: "🗿", gradient: "from-[#a8a29e] to-[#292524]" },
  { id: "gigachad", label: "Gigachad", emoji: "💪", gradient: "from-[#e3c88f] to-[#4a3512]" },
  { id: "doge", label: "Doge", emoji: "🐶", gradient: "from-[#f6c76b] to-[#8a5a16]" },
  { id: "cheems", label: "Cheems", emoji: "🐕", gradient: "from-[#e0a06c] to-[#5a2f12]" },
  { id: "pepe", label: "Pepe", emoji: "🐸", gradient: "from-[#4ade80] to-[#0f3f25]" },
  { id: "cat", label: "Cat", emoji: "🐱", gradient: "from-[#f9a8d4] to-[#831843]" },
  { id: "kitty", label: "Kitty", emoji: "😺", gradient: "from-[#f0abfc] to-[#6b21a8]" },
  { id: "panda", label: "Panda", emoji: "🐼", gradient: "from-[#cbd5e1] to-[#334155]" },
  { id: "hamster", label: "Hamster", emoji: "🐹", gradient: "from-[#fcd34d] to-[#92400e]" },
  { id: "unicorn", label: "Unicorn", emoji: "🦄", gradient: "from-[#c4b5fd] to-[#5b21b6]" },
  { id: "goat", label: "GOAT", emoji: "🐐", gradient: "from-[#d6d3d1] to-[#44403c]" },
  { id: "clown", label: "Clown", emoji: "🤡", gradient: "from-[#f87171] to-[#7f1d1d]" },
  { id: "skull", label: "Skull", emoji: "💀", gradient: "from-[#e2e8f0] to-[#1e293b]" },
  { id: "alien", label: "Alien", emoji: "👽", gradient: "from-[#5eead4] to-[#115e59]" },
  { id: "rocket", label: "Moon", emoji: "🚀", gradient: "from-[#60a5fa] to-[#1e3a8a]" },
  { id: "fire", label: "Fire", emoji: "🔥", gradient: "from-[#fb923c] to-[#7c2d12]" },
  { id: "diamond", label: "Diamond", emoji: "💎", gradient: "from-[#7dd3fc] to-[#0c4a6e]" },
  { id: "king", label: "King", emoji: "👑", gradient: "from-[#f6c76b] to-[#7a4f14]" },
  { id: "stonks", label: "Stonks", emoji: "📈", gradient: "from-[#4ade80] to-[#14532d]" },
  { id: "npc", label: "NPC", emoji: "🤖", gradient: "from-[#94a3b8] to-[#1e293b]" },
  { id: "heart", label: "Cutie", emoji: "💖", gradient: "from-[#f9a8d4] to-[#9d174d]" },
  { id: "moonface", label: "Moon", emoji: "🌙", gradient: "from-[#a5b4fc] to-[#312e81]" },
] as const;

export type AvatarPreset = (typeof avatarPresets)[number]["id"];

const presetIds = new Set<string>(avatarPresets.map((preset) => preset.id));

/** Older seats keep a familiar face after the meme avatar refresh. */
const legacyAliases: Record<string, AvatarPreset> = {
  spade: "chad",
  crown: "king",
  comet: "rocket",
  gem: "diamond",
  flame: "fire",
  bolt: "npc",
  rose: "cat",
  moon: "moonface",
};

export function isAvatarPreset(value: string): value is AvatarPreset {
  return presetIds.has(value);
}

export const defaultAvatarPreset: AvatarPreset = "chad";

export function toAvatarPreset(value: string | null | undefined): AvatarPreset {
  if (!value) return defaultAvatarPreset;
  const mapped = legacyAliases[value] ?? value;
  return isAvatarPreset(mapped) ? mapped : defaultAvatarPreset;
}
