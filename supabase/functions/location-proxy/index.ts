import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Location API Proxy Edge Function
 *
 * Proxies requests to Photon and Nominatim APIs to avoid CORS issues
 * and improve UK address search quality.
 *
 * Usage:
 * - Photon: /functions/v1/location-proxy?q=london&limit=10
 * - Nominatim: /functions/v1/location-proxy?service=nominatim&q=london&limit=10&countrycodes=gb
 */

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(req.headers.get("origin") || ""),
    });
  }

  try {
    const url = new URL(req.url);
    const service = url.searchParams.get("service") || "photon";
    const query = url.searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({
          error:
            "Query parameter 'q' is required and must be at least 2 characters",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(req.headers.get("origin") || ""),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Build API URL based on service
    let apiUrl: string;

    if (service === "nominatim") {
      // Nominatim API with UK prioritization
      const countrycodes = url.searchParams.get("countrycodes") || "gb";
      const limit = url.searchParams.get("limit") || "10";
      const addressdetails = url.searchParams.get("addressdetails") || "1";
      const acceptLanguage = url.searchParams.get("accept-language") || "en-GB";

      apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=${addressdetails}&countrycodes=${countrycodes}&accept-language=${acceptLanguage}`;
    } else {
      // Photon API (default) with conservative params.
      // Photon is strict about parameter formats; malformed osm_tag values can trigger HTTP 400.
      const limit = url.searchParams.get("limit") || "10";
      const lang = url.searchParams.get("lang") || "en";

      const photonParams = new URLSearchParams();
      photonParams.set("q", query);
      photonParams.set("limit", limit);
      photonParams.set("lang", lang);

      // Keep optional osm_tag support, but normalize comma-separated lists to repeated params.
      const rawOsmTags = url.searchParams.getAll("osm_tag");
      const normalizedTags = rawOsmTags
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean);
      for (const tag of normalizedTags) {
        photonParams.append("osm_tag", tag);
      }

      // Do not forward non-standard params like location_bias_scale to avoid upstream 400s.
      apiUrl = `https://photon.komoot.io/api/?${photonParams.toString()}`;
    }

    // Fetch from location API
    const apiResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "TheraMate/1.0 (https://theramate.co.uk)",
        Referer: req.headers.get("referer") || "https://theramate.co.uk",
      },
    });

    if (!apiResponse.ok) {
      console.error(
        `Location API error: ${apiResponse.status} ${apiResponse.statusText}`,
      );
      return new Response(
        JSON.stringify({ error: `Location API error: ${apiResponse.status}` }),
        {
          status: apiResponse.status,
          headers: {
            ...corsHeaders(req.headers.get("origin") || ""),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const data = await apiResponse.json();

    // For Photon, filter and prioritize UK results
    if (service === "photon" && data.features) {
      const ukFeatures = data.features.filter((feature: any) => {
        const country = feature.properties?.country?.toLowerCase() || "";
        return (
          country === "united kingdom" ||
          country === "gb" ||
          country === "great britain"
        );
      });

      // If we have UK results, prioritize them; otherwise return all
      if (ukFeatures.length > 0) {
        data.features = [
          ...ukFeatures,
          ...data.features.filter((f: any) => {
            const country = f.properties?.country?.toLowerCase() || "";
            return (
              country !== "united kingdom" &&
              country !== "gb" &&
              country !== "great britain"
            );
          }),
        ].slice(0, parseInt(url.searchParams.get("limit") || "10"));
      }
    }

    // For Nominatim, filter UK results
    if (service === "nominatim" && Array.isArray(data)) {
      const ukResults = data.filter((item: any) => {
        const country = item.address?.country?.toLowerCase() || "";
        const countryCode = item.address?.country_code?.toLowerCase() || "";
        return (
          country === "united kingdom" ||
          countryCode === "gb" ||
          country.includes("britain")
        );
      });

      if (ukResults.length > 0) {
        data.splice(0, data.length, ...ukResults);
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders(req.headers.get("origin") || ""),
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("Location proxy error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders(req.headers.get("origin") || ""),
          "Content-Type": "application/json",
        },
      },
    );
  }
});
