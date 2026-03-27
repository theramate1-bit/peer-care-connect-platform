import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers - restrict to allowed origins in production
const getAllowedOrigin = (): string => {
  const origin = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedOrigins = origin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    return allowedOrigins[0];
  }

  return Deno.env.get("ENVIRONMENT") === "production" ? "" : "*";
};

const corsHeaders = (origin?: string | null): Record<string, string> => {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = origin || "*";

  const corsOrigin =
    allowedOrigin === "*" || Deno.env.get("ENVIRONMENT") !== "production"
      ? "*"
      : allowedOrigin.includes(requestOrigin)
        ? requestOrigin
        : "";

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
};

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  status?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    // Handle OAuth callback (GET request with code)
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // Can contain user session info if needed

    if (req.method === "GET" && code) {
      // OAuth callback - exchange code for token
      // Note: In a production setup, you'd need to pass the user ID via state
      // For now, we'll return a redirect with the code
      const appUrl =
        Deno.env.get("APP_URL") ||
        Deno.env.get("SITE_URL") ||
        "https://theramate.co.uk";
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${appUrl}/auth/google-calendar-callback?code=${code}`,
        },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Validate Content-Type for POST requests
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return new Response(
          JSON.stringify({ error: "Content-Type must be application/json" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(origin),
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    // Parse and validate request body for POST requests
    let body: any = {};
    if (req.method === "POST") {
      try {
        const bodyText = await req.text();
        if (bodyText.length > 10 * 1024 * 1024) {
          // 10MB limit
          return new Response(
            JSON.stringify({ error: "Request body is too large (max 10MB)" }),
            {
              status: 400,
              headers: {
                ...corsHeaders(origin),
                "Content-Type": "application/json",
              },
            },
          );
        }
        if (bodyText && bodyText.trim().length > 0) {
          body = JSON.parse(bodyText);
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON in request body" }),
          {
            status: 400,
            headers: {
              ...corsHeaders(origin),
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    // Validate OAuth code parameter if present
    if (code && (typeof code !== "string" || code.length > 500)) {
      return new Response(
        JSON.stringify({ error: "Invalid OAuth code parameter" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const { action, ...params } = body;

    // Validate action parameter
    if (req.method === "POST" && (!action || typeof action !== "string")) {
      return new Response(
        JSON.stringify({
          error: "Action parameter is required for POST requests",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate action is one of allowed values
    const validActions = [
      "get_auth_url",
      "exchange_code",
      "create_event",
      "list_events",
      "update_event",
      "delete_event",
    ];
    if (action && !validActions.includes(action)) {
      return new Response(
        JSON.stringify({
          error: `Invalid action. Must be one of: ${validActions.join(", ")}`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    switch (action) {
      case "get_auth_url":
        return handleGetAuthUrl(googleClientId, user.id);

      case "exchange_code":
        return handleExchangeCode(
          params.code,
          googleClientId,
          googleClientSecret,
          supabase,
          user.id,
        );

      case "refresh_token":
        return handleRefreshToken(
          params.refreshToken,
          googleClientId,
          googleClientSecret,
          supabase,
          user.id,
        );

      case "sync_events":
        return handleSyncEvents(
          supabase,
          user.id,
          googleClientId,
          googleClientSecret,
        );

      case "push_event":
        return handlePushEvent(
          params.event,
          supabase,
          user.id,
          googleClientId,
          googleClientSecret,
        );

      case "fetch_events":
        return handleFetchEvents(
          params.startTime,
          params.endTime,
          supabase,
          user.id,
          googleClientId,
          googleClientSecret,
        );

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});

function handleGetAuthUrl(googleClientId: string, userId?: string): Response {
  const baseUrl =
    Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") ||
    "https://aikqnvltuwwgifuocvto.supabase.co";
  const redirectUri = `${baseUrl}/functions/v1/google-calendar-sync`;
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", googleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  if (userId) {
    authUrl.searchParams.set("state", userId); // Pass user ID in state for callback
  }

  return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

async function handleExchangeCode(
  code: string,
  googleClientId: string,
  googleClientSecret: string,
  supabase: any,
  userId: string,
): Promise<Response> {
  const redirectUri = `${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || "https://aikqnvltuwwgifuocvto.supabase.co"}/functions/v1/google-calendar-sync`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokens: GoogleTokenResponse = await tokenResponse.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Get primary calendar ID
  const calendarResponse = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    },
  );

  let calendarId = "primary";
  if (calendarResponse.ok) {
    const calendarList = await calendarResponse.json();
    const primaryCalendar =
      calendarList.items?.find((cal: any) => cal.primary) ||
      calendarList.items?.[0];
    calendarId = primaryCalendar?.id || "primary";
  }

  // Save tokens to database
  const { error } = await supabase.from("calendar_sync_configs").upsert({
    user_id: userId,
    provider: "google",
    enabled: true,
    calendar_id: calendarId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: expiresAt.toISOString(),
    last_sync: new Date().toISOString(),
  });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true, calendarId }), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

async function handleRefreshToken(
  refreshToken: string,
  googleClientId: string,
  googleClientSecret: string,
  supabase: any,
  userId: string,
): Promise<Response> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("Token refresh failed");
  }

  const tokens: GoogleTokenResponse = await tokenResponse.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabase
    .from("calendar_sync_configs")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google");

  return new Response(
    JSON.stringify({
      access_token: tokens.access_token,
      expires_at: expiresAt.toISOString(),
    }),
    { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
}

async function getValidAccessToken(
  supabase: any,
  userId: string,
  googleClientId: string,
  googleClientSecret: string,
): Promise<string> {
  const { data: config, error } = await supabase
    .from("calendar_sync_configs")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("enabled", true)
    .single();

  if (error || !config) {
    throw new Error("Calendar sync not configured");
  }

  // Check if token is expired or expires soon (within 5 minutes)
  const expiresAt = new Date(config.token_expires_at);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow && config.refresh_token) {
    // Refresh the token
    const refreshResponse = await handleRefreshToken(
      config.refresh_token,
      googleClientId,
      googleClientSecret,
      supabase,
      userId,
    );
    const refreshed = await refreshResponse.json();
    return refreshed.access_token;
  }

  return config.access_token;
}

async function handleSyncEvents(
  supabase: any,
  userId: string,
  googleClientId: string,
  googleClientSecret: string,
): Promise<Response> {
  const accessToken = await getValidAccessToken(
    supabase,
    userId,
    googleClientId,
    googleClientSecret,
  );

  // Get sync config
  const { data: config } = await supabase
    .from("calendar_sync_configs")
    .select("calendar_id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  const calendarId = config?.calendar_id || "primary";

  // Fetch events from Google Calendar (last 30 days to next 90 days)
  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const eventsResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!eventsResponse.ok) {
    throw new Error("Failed to fetch calendar events");
  }

  const eventsData = await eventsResponse.json();
  const googleEvents = eventsData.items || [];

  // Get internal bookings/sessions
  const { data: sessions } = await supabase
    .from("client_sessions")
    .select("*")
    .or(`therapist_id.eq.${userId},client_id.eq.${userId}`)
    .gte("session_date", new Date(timeMin).toISOString().split("T")[0])
    .lte("session_date", new Date(timeMax).toISOString().split("T")[0]);

  // Sync Google events to database
  const syncedEvents = [];
  for (const event of googleEvents) {
    if (event.status === "cancelled") continue;

    const startTime = event.start.dateTime || `${event.start.date}T00:00:00Z`;
    const endTime = event.end.dateTime || `${event.end.date}T23:59:59Z`;

    const { data: synced } = await supabase
      .from("calendar_events")
      .upsert(
        {
          user_id: userId,
          external_event_id: event.id,
          external_id: event.id, // Keep for backward compatibility
          title: event.summary || "Untitled Event",
          description: event.description,
          start_time: startTime,
          end_time: endTime,
          location: event.location,
          provider: "google",
          source: "google", // Keep for backward compatibility
          event_type: "appointment",
          status: event.status === "confirmed" ? "confirmed" : "tentative",
          attendees: event.attendees || [],
          last_synced_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,external_event_id,provider",
        },
      )
      .select()
      .single();

    syncedEvents.push(synced);
  }

  // Push internal events to Google Calendar
  for (const session of sessions || []) {
    const sessionStart = new Date(
      `${session.session_date}T${session.start_time}`,
    );
    const sessionEnd = new Date(
      sessionStart.getTime() + (session.duration_minutes || 60) * 60 * 1000,
    );

    // Check if event already exists
    const existingEvent = syncedEvents.find(
      (e) => e?.internal_event_id === session.id,
    );

    if (!existingEvent) {
      const googleEvent: GoogleCalendarEvent = {
        summary: `${session.session_type || "Session"}`,
        description: session.notes || "",
        start: { dateTime: sessionStart.toISOString(), timeZone: "UTC" },
        end: { dateTime: sessionEnd.toISOString(), timeZone: "UTC" },
        status: "confirmed",
      };

      const createResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        },
      );

      if (createResponse.ok) {
        const createdEvent = await createResponse.json();
        await supabase.from("calendar_events").insert({
          user_id: userId,
          external_event_id: createdEvent.id,
          external_id: createdEvent.id, // Keep for backward compatibility
          internal_event_id: session.id,
          title: googleEvent.summary,
          description: googleEvent.description,
          start_time: sessionStart.toISOString(),
          end_time: sessionEnd.toISOString(),
          provider: "google",
          source: "google", // Keep for backward compatibility
          event_type: "session",
          status: "confirmed",
          last_synced_at: new Date().toISOString(),
        });
      }
    }
  }

  // Update last sync time
  await supabase
    .from("calendar_sync_configs")
    .update({ last_sync: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "google");

  return new Response(
    JSON.stringify({ success: true, synced: syncedEvents.length }),
    { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
}

async function handlePushEvent(
  event: any,
  supabase: any,
  userId: string,
  googleClientId: string,
  googleClientSecret: string,
): Promise<Response> {
  const accessToken = await getValidAccessToken(
    supabase,
    userId,
    googleClientId,
    googleClientSecret,
  );

  const { data: config } = await supabase
    .from("calendar_sync_configs")
    .select("calendar_id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  const calendarId = config?.calendar_id || "primary";

  const googleEvent: GoogleCalendarEvent = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: new Date(event.start_time).toISOString(),
      timeZone: "UTC",
    },
    end: { dateTime: new Date(event.end_time).toISOString(), timeZone: "UTC" },
    location: event.location,
    attendees: event.attendees,
    status: "confirmed",
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleEvent),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to create calendar event");
  }

  const createdEvent = await response.json();

  return new Response(
    JSON.stringify({ success: true, eventId: createdEvent.id }),
    { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
  );
}

async function handleFetchEvents(
  startTime: string,
  endTime: string,
  supabase: any,
  userId: string,
  googleClientId: string,
  googleClientSecret: string,
): Promise<Response> {
  const accessToken = await getValidAccessToken(
    supabase,
    userId,
    googleClientId,
    googleClientSecret,
  );

  const { data: config } = await supabase
    .from("calendar_sync_configs")
    .select("calendar_id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  const calendarId = config?.calendar_id || "primary";

  const eventsResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${startTime}&timeMax=${endTime}&singleEvents=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!eventsResponse.ok) {
    throw new Error("Failed to fetch calendar events");
  }

  const eventsData = await eventsResponse.json();
  return new Response(JSON.stringify({ events: eventsData.items || [] }), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}
