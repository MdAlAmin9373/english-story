import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// 32 random bytes as base64url (43 chars). Used for state, nonce and the PKCE verifier.
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

// RFC 7636 S256: BASE64URL(SHA256(verifier)).
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomToken();
  return { verifier, challenge: pkceChallenge(verifier) };
}

// Constant-time string comparison. Hashing first gives equal-length buffers,
// so inputs of different lengths are compared safely too.
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
