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

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "online", message: "Z-API Webhook Endpoint Ativo" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    const statusZApi = body.status; // "READ" | "RECEIVED" | "SENT"
    const ids = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);

    if (!ids || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum message_id fornecido no payload da Z-API" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agora = new Date().toISOString();

    if (statusZApi === "READ") {
      for (const msgId of ids) {
        await supabase
          .from("disparo_whatsapp_log")
          .update({
            status: "lido",
            lido_em: agora,
            entregue_em: agora,
          })
          .or(`message_id.eq.${msgId},zaap_id.eq.${msgId}`);
      }
    } else if (statusZApi === "RECEIVED") {
      for (const msgId of ids) {
        await supabase
          .from("disparo_whatsapp_log")
          .update({
            status: "entregue",
            entregue_em: agora,
          })
          .or(`message_id.eq.${msgId},zaap_id.eq.${msgId}`)
          .neq("status", "lido");
      }
    }

    return new Response(
      JSON.stringify({ success: true, status_processado: statusZApi, ids_afetados: ids }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
