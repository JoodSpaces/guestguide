import { describe, it, expect } from "vitest";
import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QGxyz",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
  ])("accepts a real browser push service: %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",           // not https
    "https://169.254.169.254/latest/meta-data/",        // cloud metadata
    "https://localhost/hook",
    "https://internal.service.local/x",
    "https://evil.example.com/fcm.googleapis.com",
    "https://fcm.googleapis.com.evil.example.com/x",   // suffix trick
    "https://evilfcm.googleapis.com.attacker.io/x",
    "https://user:pass@fcm.googleapis.com/x",           // credentials in URL
    "https://fcm.googleapis.com:8443/x",                // non-standard port
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });
});
