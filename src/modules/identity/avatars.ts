export type AvatarPresetDef = {
  id: string;
  label: string;
  /** Meme portrait shipped in /public/avatars. */
  image: string;
  /** Fallback emoji if the portrait cannot load. */
  emoji: string;
  gradient: string;
};

export const avatarPresets = [
  { id: "chad", label: "Chad", image: "/avatars/chad.webp", emoji: "🗿", gradient: "from-[#a8a29e] to-[#292524]" },
  { id: "doge", label: "Doge", image: "/avatars/doge.webp", emoji: "🐶", gradient: "from-[#f6c76b] to-[#8a5a16]" },
  { id: "cheems", label: "Cheems", image: "/avatars/cheems.webp", emoji: "🐕", gradient: "from-[#e0a06c] to-[#5a2f12]" },
  { id: "pepe", label: "Pepe", image: "/avatars/pepe.webp", emoji: "🐸", gradient: "from-[#4ade80] to-[#0f3f25]" },
  { id: "cat", label: "Smug Cat", image: "/avatars/cat.webp", emoji: "🐱", gradient: "from-[#f9a8d4] to-[#831843]" },
  { id: "clown", label: "Clown", image: "/avatars/clown.webp", emoji: "🤡", gradient: "from-[#f87171] to-[#7f1d1d]" },
  { id: "skull", label: "Skull", image: "/avatars/skull.webp", emoji: "💀", gradient: "from-[#e2e8f0] to-[#1e293b]" },
  { id: "goat", label: "GOAT", image: "/avatars/goat.webp", emoji: "🐐", gradient: "from-[#d6d3d1] to-[#44403c]" },
  { id: "alien", label: "Alien", image: "/avatars/alien.webp", emoji: "👽", gradient: "from-[#5eead4] to-[#115e59]" },
  { id: "panda", label: "Panda", image: "/avatars/panda.webp", emoji: "🐼", gradient: "from-[#cbd5e1] to-[#334155]" },
  { id: "unicorn", label: "Unicorn", image: "/avatars/unicorn.webp", emoji: "🦄", gradient: "from-[#c4b5fd] to-[#5b21b6]" },
  { id: "stonks", label: "Stonks", image: "/avatars/stonks.webp", emoji: "📈", gradient: "from-[#4ade80] to-[#14532d]" },
  { id: "king", label: "King", image: "/avatars/king.webp", emoji: "👑", gradient: "from-[#f6c76b] to-[#7a4f14]" },
  { id: "npc", label: "NPC", image: "/avatars/npc.webp", emoji: "🤖", gradient: "from-[#94a3b8] to-[#1e293b]" },
  { id: "rocket", label: "Moon", image: "/avatars/rocket.webp", emoji: "🚀", gradient: "from-[#60a5fa] to-[#1e3a8a]" },
  { id: "heart", label: "Cutie", image: "/avatars/heart.webp", emoji: "💖", gradient: "from-[#f9a8d4] to-[#9d174d]" },
] as const satisfies readonly AvatarPresetDef[];

export type AvatarPreset = (typeof avatarPresets)[number]["id"];

const presetIds = new Set<string>(avatarPresets.map((preset) => preset.id));

/** Older seats keep a familiar face after the meme portrait refresh. */
const legacyAliases: Record<string, AvatarPreset> = {
  gigachad: "chad",
  kitty: "cat",
  hamster: "cheems",
  fire: "clown",
  diamond: "stonks",
  moonface: "rocket",
  spade: "chad",
  crown: "king",
  comet: "rocket",
  gem: "stonks",
  flame: "clown",
  bolt: "npc",
  rose: "cat",
  moon: "rocket",
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
