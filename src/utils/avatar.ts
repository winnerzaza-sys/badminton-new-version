import type { CSSProperties } from "react";
// Stable per-player hue so the same person keeps one avatar colour everywhere.
export function avatarStyle(id: string): CSSProperties {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  // Golden-angle step spreads near-identical ids (p-1, p-2…) around the wheel.
  return {
    "--avatar-hue": Math.round((hash * 137.508) % 360),
  } as CSSProperties;
}
