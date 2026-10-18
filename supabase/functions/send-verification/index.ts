import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { memberId, role = "member", email } = await req.json();
    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "Missing memberId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "GP-";
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const nowIso = new Date().toISOString();

    if (role === "owner") {
      await supabaseClient
        .from("gyms")
        .update({ verification_token: token, verification_sent_at: nowIso, owner_email: email || undefined })
        .eq("id", memberId);
    } else {
      await supabaseClient
        .from("members")
        .update({ verification_token: token, verification_sent_at: nowIso, email: email || undefined })
        .eq("id", memberId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        token,
        message: "Verification token generated successfully."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
