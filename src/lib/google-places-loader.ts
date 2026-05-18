/**
 * Google Places loader — sprint C.S.1.6.1.
 *
 * Lazy, singleton loader for the Google Maps JavaScript API + the
 * `places` library. Used by CarbonChat to wire address autocomplete
 * onto the first-message textarea.
 *
 * Defaults:
 * - Loads on demand (never blocks page paint).
 * - Singleton: the promise is cached after first call, so opening the
 *   chat panel and closing/reopening it doesn't re-inject the script.
 * - Resolves `null` gracefully when:
 *     - we're running on the server (SSR),
 *     - `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` is not configured,
 *     - the script fails to load (network / blocked / CSP).
 *   Callers treat null as "autocomplete unavailable" and continue
 *   without it — the textarea still works.
 */

declare global {
  // eslint-disable-next-line no-var
  var google: typeof window & { maps?: { places?: unknown } };
}

type PlacesNamespace = {
  Autocomplete: new (
    input: HTMLInputElement,
    opts?: {
      types?: string[];
      componentRestrictions?: { country: string | string[] };
      fields?: string[];
    },
  ) => {
    addListener(event: string, handler: () => void): { remove: () => void };
    getPlace(): { formatted_address?: string; place_id?: string; name?: string };
    setComponentRestrictions(r: { country: string | string[] }): void;
  };
};

let cached: Promise<PlacesNamespace | null> | null = null;

const CALLBACK_NAME = "__cs_gplaces_loaded";

export function loadGooglePlaces(): Promise<PlacesNamespace | null> {
  if (cached) return cached;

  cached = new Promise<PlacesNamespace | null>((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }

    // Already loaded by some earlier code path? Reuse.
    const existing = (window as unknown as {
      google?: { maps?: { places?: PlacesNamespace } };
    }).google?.maps?.places;
    if (existing && typeof existing.Autocomplete === "function") {
      resolve(existing);
      return;
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!key) {
      console.warn(
        "[carbon-places] NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is not set — autocomplete disabled.",
      );
      resolve(null);
      return;
    }

    // Bind the callback the script will fire when the library is ready.
    (window as unknown as Record<string, unknown>)[CALLBACK_NAME] = () => {
      try {
        delete (window as unknown as Record<string, unknown>)[CALLBACK_NAME];
      } catch {
        /* noop */
      }
      const places = (window as unknown as {
        google?: { maps?: { places?: PlacesNamespace } };
      }).google?.maps?.places;
      resolve(places && typeof places.Autocomplete === "function" ? places : null);
    };

    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(key)}` +
      `&libraries=places` +
      `&v=weekly` +
      `&callback=${CALLBACK_NAME}` +
      `&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.warn("[carbon-places] Failed to load Maps JS — autocomplete disabled.");
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return cached;
}

export type { PlacesNamespace };
