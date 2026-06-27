import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Verifies a Firebase ID token server-side against Google's published public
 * keys — no service-account secret required, only the (public) project id.
 *
 * Firebase ID tokens are RS256 JWTs signed by Google. We check the signature,
 * the issuer, the audience (your project), and expiry. Returns the caller's uid
 * on success, or null if the token is missing/invalid/expired.
 */

const PROJECT_ID = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').trim();

// jose caches the fetched keys and refreshes them as needed.
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export async function verifyFirebaseIdToken(authorizationHeader?: string | null): Promise<string | null> {
  if (!PROJECT_ID) return null;

  const match = (authorizationHeader || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
      algorithms: ['RS256'],
    });
    // `sub` is the Firebase uid; `auth_time` must exist on a real ID token.
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
