// GitHub stores file contents as base64. These convert to/from UTF-8 text
// using only web-standard APIs so the client runs unchanged in the browser.

export function decodeBase64ToText(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeTextToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
