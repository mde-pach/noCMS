// The verifier is a high-entropy secret kept client-side; only its SHA-256
// challenge travels in the authorize URL.

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function sha256Base64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return base64url(new Uint8Array(digest));
}

export interface Pkce {
  verifier: string;
  challenge: string;
}

export async function generatePkce(): Promise<Pkce> {
  const verifier = randomBase64url(32);
  return { verifier, challenge: await sha256Base64url(verifier) };
}

export function randomState(): string {
  return randomBase64url(16);
}
