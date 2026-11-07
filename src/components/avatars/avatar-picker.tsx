"use client";

import { useRef, useState } from "react";
import NextImage from "next/image";
import { Camera, Trash2 } from "lucide-react";
import { avatarPresets, type AvatarPreset } from "@/modules/identity/avatars";
import { AvatarPresetMark } from "@/components/user-avatar";
import { cn } from "@/lib/client-utils";

export type AvatarSelection = {
  preset: AvatarPreset;
  image: string | null;
};

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image"));
    image.src = source;
  });
}

export async function toAvatarDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a PNG, JPEG or WebP image");
  if (file.size > 5_000_000) throw new Error("Images must be under 5 MB");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const side = 192;
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process that image");
    const scale = Math.max(side / image.width, side / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (side - width) / 2, (side - height) / 2, width, height);
    const webp = canvas.toDataURL("image/webp", 0.85);
    if (webp.startsWith("data:image/webp")) return webp;
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AvatarPicker({
  value,
  onChange,
  disabled,
}: {
  value: AvatarSelection;
  onChange: (value: AvatarSelection) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const image = await toAvatarDataUrl(file);
      onChange({ preset: value.preset, image });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not use that image");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-2">
        {avatarPresets.map((preset) => {
          const selected = !value.image && value.preset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled || reading}
              onClick={() => onChange({ preset: preset.id, image: null })}
              aria-label={preset.label}
              aria-pressed={selected}
              className={cn(
                "relative grid place-items-center rounded-full transition disabled:opacity-50",
                selected ? "ring-2 ring-gold ring-offset-2 ring-offset-surface" : "opacity-80 hover:opacity-100",
              )}
            >
              <AvatarPresetMark preset={preset.id} size="md" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-line/60 bg-bg/30 p-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-surface-2">
          {value.image ? (
            <NextImage
              src={value.image}
              alt="Selected avatar"
              width={48}
              height={48}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            <AvatarPresetMark preset={value.preset} size="lg" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-ink">{value.image ? "Photo uploaded" : "Or upload a photo"}</p>
          <p className="mt-0.5 text-[9px] text-muted/55">PNG, JPEG or WebP. Cropped to a square.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={disabled || reading}
            onClick={() => inputRef.current?.click()}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line/70 px-2.5 text-[9px] font-medium text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-50"
          >
            <Camera className="size-3" />
            {reading ? "Reading…" : "Upload"}
          </button>
          {value.image ? (
            <button
              type="button"
              disabled={disabled || reading}
              onClick={() => onChange({ preset: value.preset, image: null })}
              className="grid size-8 place-items-center rounded-lg border border-line/70 text-muted transition hover:border-red/40 hover:text-red disabled:opacity-50"
              aria-label="Remove photo"
            >
              <Trash2 className="size-3" />
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      {error ? <p className="text-[9px] text-red/85">{error}</p> : null}
    </div>
  );
}
