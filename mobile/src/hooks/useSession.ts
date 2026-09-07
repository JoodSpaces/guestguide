import { createContext, useContext } from "react";
import type { StoredSession } from "@/lib/auth";

export interface SessionContextValue {
  session: StoredSession | null;
  setSession: (s: StoredSession | null) => void;
}

export const SessionContext = createContext<SessionContextValue>({ session: null, setSession: () => {} });
export const useSession = () => useContext(SessionContext);
