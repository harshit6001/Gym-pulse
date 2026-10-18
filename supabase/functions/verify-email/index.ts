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

    const { token: rawToken } = await req.json();
    const token = String(rawToken || "").trim().toUpperCase();

    if (!token || token.length < 4) {
      return new Response(
        JSON.stringify({ error: "Invalid verification token." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowIso = new Date().toISOString();

    // 1. Members
    const { data: member, error: memberErr } = await supabaseClient
      .from("members")
      .select("id, name, email")
      .ilike("verification_token", token)
      .limit(1)
      .maybeSingle();

    if (!memberErr && member) {
      await supabaseClient
        .from("members")
        .update({ email_verified: true, verification_token: null, updated_at: nowIso })
        .eq("id", member.id);

      return new Response(
        JSON.stringify({
          success: true,
          role: "member",
          name: member.name,
          email: member.email,
          message: `Email verified successfully for ${member.name}!`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Gyms
    const { data: gym, error: gymErr } = await supabaseClient
      .from("gyms")
      .select("id, gym_name, owner_email")
      .ilike("verification_token", token)
      .limit(1)
      .maybeSingle();

    if (!gymErr && gym) {
      await supabaseClient
        .from("gyms")
        .update({ email_verified: true, verification_token: null, updated_at: nowIso })
        .eq("id", gym.id);

      return new Response(
        JSON.stringify({
          success: true,
          role: "owner",
          name: gym.gym_name,
          email: gym.owner_email,
          message: `Gym owner email verified successfully for ${gym.gym_name}!`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid or expired verification token." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
