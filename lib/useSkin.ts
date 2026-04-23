"use client";

import { useState, useEffect, useCallback } from "react";

export type SkinId = "ming" | "pipboy" | "linen" | "luxe";

export const SKINS: { id: SkinId; label: string; swatch: string }[] = [
  { id: "ming", label: "Ming", swatch: "#c48a3c" },
  { id: "pipboy", label: "PipBoy", swatch: "#33ff33" },
  { id: "linen", label: "Linen", swatch: "#b07830" },
  { id: "luxe", label: "Luxe", swatch: "#0D6B3F" },
];

const STORAGE_KEY = "modusdaily.skin";
const DEFAULT_SKIN: SkinId = "ming";

function applySkin(id: SkinId) {
  document.body.setAttribute("data-skin", id);
}

export function useSkin() {
  const [skin, setSkinState] = useState<SkinId>(() => {
    if (typeof window === "undefined") return DEFAULT_SKIN;
    return (localStorage.getItem(STORAGE_KEY) as SkinId) ?? DEFAULT_SKIN;
  });

  // Apply on mount and when skin changes
  useEffect(() => {
    applySkin(skin);
  }, [skin]);

  const setSkin = useCallback((id: SkinId) => {
    setSkinState(id);
    localStorage.setItem(STORAGE_KEY, id);
    applySkin(id);
  }, []);

  return { skin, setSkin, skins: SKINS };
}
