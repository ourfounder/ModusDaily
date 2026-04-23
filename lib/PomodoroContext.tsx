"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePomodoro, type PomodoroState, type PomodoroActions } from "./usePomodoro";

type CtxType = PomodoroState & PomodoroActions;
const Ctx = createContext<CtxType | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const state = usePomodoro();
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function usePomodoroContext(): CtxType {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePomodoroContext must be inside <PomodoroProvider>");
  return v;
}
