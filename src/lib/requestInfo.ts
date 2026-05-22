import "server-only";

export type RequestInfo = {
  ip: string | null;
  country: string | null; // ISO-2, uppercased; null when the edge couldn't tell
  city: string | null;
  userAgent: string | null;
};

// Cloudflare uses "XX" for unknown and "T1"/"T2" for Tor — treat all as unknown.
function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  if (c === "" || c === "XX" || c === "T1" || c === "T2") return null;
  return c;
}

/** Pulls the visitor's IP, geo, and device from a request (edge headers + CF context). */
export async function getRequestInfo(request: Request): Promise<RequestInfo> {
  const h = request.headers;
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  let country = normalizeCountry(h.get("cf-ipcountry"));
  let city: string | null = null;

  // City isn't a header; it lives on the Cloudflare request context. Best-effort.
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const cf = getCloudflareContext().cf as
      | { country?: string; city?: string }
      | undefined;
    if (cf) {
      country = country ?? normalizeCountry(cf.country);
      city = cf.city ?? null;
    }
  } catch {
    // Not running on Cloudflare (local dev) — geo simply stays unknown.
  }

  return { ip, country, city, userAgent: h.get("user-agent") };
}

/** Allowed login countries (ISO-2). Configured via ALLOWED_COUNTRIES, defaults to US. */
export function allowedCountries(): string[] {
  return (process.env.ALLOWED_COUNTRIES ?? "US")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Whether a login from `country` is permitted. Fails open when the country is
 * unknown (local dev, or the edge couldn't geolocate) so we never lock everyone
 * out — only a *known* foreign country is blocked.
 */
export function isCountryAllowed(country: string | null): boolean {
  if (!country) return true;
  const list = allowedCountries();
  return list.length === 0 || list.includes(country.toUpperCase());
}
