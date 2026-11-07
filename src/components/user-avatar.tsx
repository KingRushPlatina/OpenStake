import Image from "next/image";
import { avatarPresets, toAvatarPreset, type AvatarPreset } from "@/modules/identity/avatars";
import { avatarTone, cn, initials } from "@/lib/client-utils";

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

const emojiClasses = {
  xs: "text-[13px]",
  sm: "text-[15px]",
  md: "text-[19px]",
  lg: "text-[27px]",
  xl: "text-[36px]",
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
  const index = Math.max(
    0,
    avatarPresets.findIndex((item) => item.id === entry.id),
  );
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border border-white/10 bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]",
        entry.gradient,
        sizeClasses[size],
        className,
      )}
    >
      {/* Sits under the portrait so a failed image still shows a face. */}
      <span
        className={cn("avatar-meme relative leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]", emojiClasses[size])}
        style={{ animationDelay: `${(index % 7) * 0.23}s` }}
        aria-hidden="true"
      >
        {entry.emoji}
      </span>
      <Image
        src={entry.image}
        alt=""
        fill
        sizes={`${pixelSizes[size]}px`}
        unoptimized
        className="avatar-photo pointer-events-none absolute inset-0 size-full object-cover"
        style={{ animationDelay: `${(index % 7) * 0.29}s` }}
      />
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

  if (avatarPreset) {
    return <AvatarPresetMark preset={toAvatarPreset(avatarPreset)} size={size} className={className} />;
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
