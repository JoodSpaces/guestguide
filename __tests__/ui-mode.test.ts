import { describe, expect, it } from "vitest";
import { parseUiMode, uiSwitch } from "@/lib/ui-mode";

describe("the new-look switch", () => {
  it("is classic unless the cookie says next", () => {
    expect(parseUiMode(undefined)).toBe("classic");
    expect(parseUiMode("")).toBe("classic");
    expect(parseUiMode("classic")).toBe("classic");
    expect(parseUiMode("nope")).toBe("classic");
    expect(parseUiMode("next")).toBe("next");
  });

  it("reads ?ui= only when it is exactly next or classic", () => {
    expect(uiSwitch(new URLSearchParams("ui=next"))).toBe("next");
    expect(uiSwitch(new URLSearchParams("ui=classic"))).toBe("classic");
    expect(uiSwitch(new URLSearchParams("ui=NEXT"))).toBeNull();
    expect(uiSwitch(new URLSearchParams("ui=<script>"))).toBeNull();
    expect(uiSwitch(new URLSearchParams("x=1"))).toBeNull();
  });
});
