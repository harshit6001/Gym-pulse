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

    const { role = "member", phone, password, pin } = await req.json();
    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    const cleanPass = String(password || "").trim();
    const cleanPin = String(pin || cleanPass).trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid 10-digit mobile number." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role === "owner") {
      const { data: gym, error } = await supabaseClient
        .from("gyms")
        .select("*")
        .ilike("owner_phone", `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (error || !gym) {
        return new Response(
          JSON.stringify({ error: "Mobile number not registered as gym owner." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const match =
        (gym.owner_password && gym.owner_password === cleanPass) ||
        (gym.temp_password && gym.temp_password === cleanPass);

      if (!match) {
        return new Response(
          JSON.stringify({ error: "Incorrect password." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          role: "owner",
          gymStatus: gym.status || "ACTIVE",
          blockReason: gym.block_reason || "",
          emailVerified: gym.email_verified === true,
          gym: {
            id: gym.id,
            gymName: gym.gym_name,
            ownerName: gym.owner_name,
            ownerPhone: gym.owner_phone,
            ownerEmail: gym.owner_email || "",
            emailVerified: gym.email_verified === true,
            status: gym.status || "ACTIVE"
          },
          token: `gp_jwt_owner_${gym.id}_${Date.now()}`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Member login
    const { data: member, error } = await supabaseClient
      .from("members")
      .select("*")
      .ilike("phone", `%${cleanPhone}%`)
      .limit(1)
      .maybeSingle();

    if (error || !member) {
      return new Response(
        JSON.stringify({ error: "Mobile number not registered in gym records." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isMatch = member.password
      ? member.password === cleanPass
      : cleanPass === cleanPhone.slice(-4) || cleanPass === cleanPhone;

    if (!isMatch) {
      return new Response(
        JSON.stringify({ error: "Incorrect member password." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        role: "member",
        emailVerified: member.email_verified === true,
        member: {
          id: member.id,
          gymId: member.gym_id,
          name: member.name,
          phone: member.phone,
          email: member.email || "",
          emailVerified: member.email_verified === true,
          avatar: member.avatar,
          status: member.status || "active"
        },
        token: `gp_jwt_member_${member.id}_${Date.now()}`
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
