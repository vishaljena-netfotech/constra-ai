// cryptoRandomUUIDPolyfill.ts
//
// crypto.randomUUID() is only available in "secure contexts" (HTTPS or
// localhost). When the app is served over plain HTTP (e.g. by IP address,
// as in a demo deployment without TLS), window.crypto.randomUUID is
// undefined and any code calling it throws:
//   "TypeError: crypto.randomUUID is not a function"
//
// This patches window.crypto with a randomUUID implementation when the
// native one isn't available, using crypto.getRandomValues (which IS
// available in insecure contexts) to stay cryptographically random.
//
// This must be the very first import in the client entry point (main.tsx),
// before anything else runs.
//
// NOTE: this is a stopgap for demo/non-HTTPS environments. For production,
// serve the app over HTTPS so the native implementation is used, and see
// the related fix in const.ts for the OAuth cookie's Secure attribute.

function getRandomValuesUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Per RFC 4122 §4.4: set version (4) and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  // @ts-expect-error - patching a readonly-typed method that's missing at runtime
  crypto.randomUUID = getRandomValuesUUID;
}
