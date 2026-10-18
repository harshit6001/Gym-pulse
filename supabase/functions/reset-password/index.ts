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

    const { role = "member", phone, newPassword } = await req.json();
    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    const cleanPass = String(newPassword || "").trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!cleanPass || cleanPass.length < 4) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 4 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (role === "owner") {
      const { data: gym, error } = await supabaseClient
        .from("gyms")
        .select("id, gym_name, owner_email")
        .ilike("owner_phone", `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (error || !gym) {
        return new Response(
          JSON.stringify({ error: "Gym owner not found with this mobile number." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseClient
        .from("gyms")
        .update({
          owner_password: cleanPass,
          temp_password: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", gym.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Owner password reset successfully!",
          account: { name: gym.gym_name, email: gym.owner_email, phone: cleanPhone }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const { data: member, error } = await supabaseClient
        .from("members")
        .select("id, name, email")
        .ilike("phone", `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (error || !member) {
        return new Response(
          JSON.stringify({ error: "Member not found with this mobile number." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseClient
        .from("members")
        .update({
          password: cleanPass,
          updated_at: new Date().toISOString()
        })
        .eq("id", member.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Member password reset successfully!",
          account: { name: member.name, email: member.email, phone: cleanPhone }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
