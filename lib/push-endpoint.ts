/**
 * A push subscription's `endpoint` is a URL the server will POST to when it
 * sends a notification. If we accept any URL, a guest can point it at an
 * internal address (cloud metadata, localhost, a private service) and make our
 * server call it. Browsers only ever hand out endpoints on their vendor's push
 * service, so accept exactly those hosts over https and nothing else.
 */
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",          // Chrome, Edge, Opera, Brave (FCM)
  "push.services.mozilla.com",   // Firefox
  "notify.windows.com",          // legacy Edge / Windows (WNS)
  "push.apple.com",              // Safari / iOS web push
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}
