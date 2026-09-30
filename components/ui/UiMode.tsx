"use client";

import { createContext, useContext } from "react";
import type { UiMode } from "@/lib/ui-mode";

const Ctx = createContext<UiMode>("classic");

export function UiModeProvider({ mode, children }: { mode: UiMode; children: React.ReactNode }) {
  return <Ctx.Provider value={mode}>{children}</Ctx.Provider>;
}

/** "next" when the guest is on the new look. */
export const useUiMode = (): UiMode => useContext(Ctx);
