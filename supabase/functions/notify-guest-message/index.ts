import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const conversationId = body.conversationId ?? body.conversation_id;
    const messageId = body.messageId ?? body.message_id;
    const messagePreview =
      typeof body.messagePreview === "string"
        ? body.messagePreview.slice(0, 200)
        : undefined;

    if (!conversationId || !messageId) {
      return new Response(
        JSON.stringify({ error: "conversationId and messageId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      },
    );
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();
    const authUser = session?.user;
    if (!authUser?.id) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, sender_id, conversation_id")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .single();

    if (messageError || !message) {
      return new Response(
        JSON.stringify({ ok: false, reason: "message not found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (message.sender_id !== authUser.id) {
      return new Response(
        JSON.stringify({ error: "You can only notify for messages you sent" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("participant1_id, participant2_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ ok: false, reason: "conversation not found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const recipientId =
      conversation.participant1_id === message.sender_id
        ? conversation.participant2_id
        : conversation.participant1_id;

    const { data: recipientUser, error: recipientError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, user_role")
      .eq("id", recipientId)
      .single();

    if (recipientError || !recipientUser?.email) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: "recipient not found or no email",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (recipientUser.user_role !== "guest") {
      return new Response(
        JSON.stringify({ ok: true, skipped: "recipient is not a guest" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: senderUser } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", message.sender_id)
      .single();

    const practitionerName = senderUser
      ? [senderUser.first_name, senderUser.last_name]
          .filter(Boolean)
          .join(" ") || "Your practitioner"
      : "Your practitioner";

    const siteUrl = Deno.env.get("SITE_URL") || "https://theramate.co.uk";
    const messagesRedirectUrl = `${siteUrl}/messages?conversationId=${encodeURIComponent(String(conversationId))}`;
    let viewMessageUrl = `${siteUrl}/login`;

    // Prefer a one-click magic link so guests can access messages without remembering credentials.
    try {
      const { data: magicLinkData, error: magicLinkError } =
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: recipientUser.email,
          options: { redirectTo: messagesRedirectUrl },
        });
      const actionLink = magicLinkData?.properties?.action_link;
      if (!magicLinkError && actionLink) {
        viewMessageUrl = actionLink;
      } else if (magicLinkError) {
        console.warn(
          "notify-guest-message: magic link generation failed",
          magicLinkError.message,
        );
      }
    } catch (magicErr) {
      console.warn(
        "notify-guest-message: magic link generation exception",
        magicErr,
      );
    }

    const sendEmailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        emailType: "message_notification_guest",
        recipientEmail: recipientUser.email,
        recipientName:
          [recipientUser.first_name, recipientUser.last_name]
            .filter(Boolean)
            .join(" ") || undefined,
        data: {
          practitionerName,
          messagePreview: messagePreview || undefined,
          viewMessageUrl,
        },
      }),
    });

    if (!sendEmailRes.ok) {
      const text = await sendEmailRes.text();
      console.error(
        "notify-guest-message: send-email failed",
        sendEmailRes.status,
        text,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to send notification email",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-guest-message error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
