import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy built around exactly what this app talks to:
// Firebase (auth + firestore), Google sign-in, PostHog EU, and Vercel analytics.
// Dev adds 'unsafe-eval' + ws: so Next's HMR/React-refresh keeps working.
function buildCsp(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-inline' is required for Next's hydration bootstrap + React inline styles.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://*.posthog.com",
      "https://*.vercel-scripts.com",
      "https://apis.google.com",
      "https://accounts.google.com",
      "https://www.gstatic.com",
      "https://*.googleapis.com",
      "https://checkout.razorpay.com",
      "https://cdn.razorpay.com",
      "https://checkout-static-next.razorpay.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.googleapis.com",
      "https://*.firebaseio.com",
      "wss://*.firebaseio.com",
      "https://firebaseinstallations.googleapis.com",
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      "https://*.posthog.com",
      "https://*.vercel-insights.com",
      "https://api.razorpay.com",
      "https://lumberjack.razorpay.com",
      "https://cdn.razorpay.com",
      "https://checkout-static-next.razorpay.com",
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],
    // Firebase auth iframe lives on the authDomain (*.firebaseapp.com); Google sign-in on accounts.google.com.
    "frame-src": ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com", "https://*.google.com", "https://api.razorpay.com"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([key, vals]) => (vals.length ? `${key} ${vals.join(" ")}` : key))
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildCsp() },
  // Keep allowing Google sign-in popups while isolating the browsing context.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // HSTS only has effect over HTTPS (production); harmless locally.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
