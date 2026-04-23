"use client";

import { useSkin, type SkinId } from "@/lib/useSkin";

/**
 * Compact skin switcher — three small swatch buttons.
 * Active skin gets a ring; others are plain circles.
 */
export default function SkinSwitcher() {
  const { skin, setSkin, skins } = useSkin();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
      }}
      role="radiogroup"
      aria-label="Skin"
    >
      {skins.map((s) => {
        const active = s.id === skin;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={s.label}
            title={s.label}
            onClick={() => setSkin(s.id)}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: s.swatch,
              border: active
                ? "2px solid var(--ink)"
                : "1px solid var(--ink-faint)",
              cursor: "pointer",
              padding: 0,
              outline: "none",
              opacity: active ? 1 : 0.5,
              transition: "opacity 0.15s, border-color 0.15s",
              boxShadow: active ? `0 0 6px ${s.swatch}40` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
