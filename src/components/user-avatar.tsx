import Image from "next/image";
import { Crown, Flame, Gem, Heart, Moon, Spade, Sparkles, Zap } from "lucide-react";
import { avatarPresets, type AvatarPreset } from "@/modules/identity/avatars";
import { avatarTone, cn, initials } from "@/lib/client-utils";

const icons = {
  spade: Spade,
  crown: Crown,
  comet: Sparkles,
  gem: Gem,
  flame: Flame,
  bolt: Zap,
  rose: Heart,
  moon: Moon,
} as const;

const presetById = new Map<string, (typeof avatarPresets)[number]>(
  avatarPresets.map((preset) => [preset.id, preset]),
);

const sizeClasses = {
  xs: "size-6 rounded-full text-[8px]",
  sm: "size-7 rounded-full text-[9px]",
  md: "size-9 rounded-full text-[10px]",
  lg: "size-12 rounded-full text-sm",
  xl: "size-16 rounded-full text-lg",
};

const iconClasses = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
  xl: "size-7",
};

const pixelSizes = {
  xs: 24,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

export function AvatarPresetMark({
  preset,
  size = "md",
  className,
}: {
  preset: AvatarPreset;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const entry = presetById.get(preset) ?? avatarPresets[0];
  const Icon = icons[entry.icon as keyof typeof icons] ?? Spade;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center border border-white/10 bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
        entry.gradient,
        sizeClasses[size],
        className,
      )}
    >
      <Icon className={cn("drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]", iconClasses[size])} strokeWidth={2.1} />
    </span>
  );
}

export function UserAvatar({
  name,
  userId,
  avatarPreset,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  userId: string;
  avatarPreset?: string | null;
  avatarUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <span
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-surface-2",
          sizeClasses[size],
          className,
        )}
      >
        <Image
          src={avatarUrl}
          alt={name}
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          unoptimized
          className="size-full object-cover"
        />
      </span>
    );
  }

  const preset = presetById.get(avatarPreset ?? "");
  if (preset) {
    return <AvatarPresetMark preset={preset.id} size={size} className={className} />;
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-white/5 bg-gradient-to-br font-semibold text-white/90",
        avatarTone(userId),
        sizeClasses[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export { icons as avatarIcons };
