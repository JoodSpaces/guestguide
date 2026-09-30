import { describe, expect, it } from "vitest";
import { parseUiMode, uiSwitch } from "@/lib/ui-mode";

describe("the new-look switch", () => {
  it("is the new look unless the cookie says classic", () => {
    expect(parseUiMode(undefined)).toBe("next");
    expect(parseUiMode("")).toBe("next");
    expect(parseUiMode("nope")).toBe("next");
    expect(parseUiMode("next")).toBe("next");
    expect(parseUiMode("classic")).toBe("classic");
  });

  it("reads ?ui= only when it is exactly next or classic", () => {
    expect(uiSwitch(new URLSearchParams("ui=next"))).toBe("next");
    expect(uiSwitch(new URLSearchParams("ui=classic"))).toBe("classic");
    expect(uiSwitch(new URLSearchParams("ui=NEXT"))).toBeNull();
    expect(uiSwitch(new URLSearchParams("ui=<script>"))).toBeNull();
    expect(uiSwitch(new URLSearchParams("x=1"))).toBeNull();
  });
});
