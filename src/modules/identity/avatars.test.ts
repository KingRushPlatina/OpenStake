import { describe, expect, it } from "vitest";
import {
  avatarPresets,
  defaultAvatarPreset,
  isAvatarPreset,
  toAvatarPreset,
} from "@/modules/identity/avatars";

describe("meme avatars", () => {
  it("ships a varied set of meme portraits", () => {
    expect(avatarPresets.length).toBeGreaterThanOrEqual(8);
    expect(avatarPresets.some((preset) => preset.id === "chad")).toBe(true);
    expect(avatarPresets.some((preset) => preset.id === "doge")).toBe(true);
    expect(avatarPresets.some((preset) => preset.id === "pepe")).toBe(true);
    expect(new Set(avatarPresets.map((preset) => preset.id)).size).toBe(avatarPresets.length);
    expect(new Set(avatarPresets.map((preset) => preset.image)).size).toBe(avatarPresets.length);
    expect(avatarPresets.every((preset) => preset.image.startsWith("/avatars/"))).toBe(true);
  });

  it("maps old seat presets to the new meme faces", () => {
    expect(isAvatarPreset("doge")).toBe(true);
    expect(isAvatarPreset("spade")).toBe(false);
    expect(toAvatarPreset("spade")).toBe("chad");
    expect(toAvatarPreset("rose")).toBe("cat");
    expect(toAvatarPreset("moon")).toBe("rocket");
    expect(toAvatarPreset(null)).toBe(defaultAvatarPreset);
    expect(toAvatarPreset("nope")).toBe(defaultAvatarPreset);
  });
});
