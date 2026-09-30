import { cookies } from "next/headers";
import { UI_COOKIE, parseUiMode, type UiMode } from "@/lib/ui-mode";

/** The look this guest chose (server components). */
export async function getUiMode(): Promise<UiMode> {
  return parseUiMode((await cookies()).get(UI_COOKIE)?.value);
}
