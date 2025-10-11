import { supabase } from "@/lib/supabaseClient";

function generateCode(len = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const N8N_CERT_WEBHOOK = import.meta.env.VITE_N8N_CERT_WEBHOOK;

export async function requestCertificate(courseId: string) {
  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResp?.user) throw new Error("Usuario no autenticado");

  const user = userResp.user;
  const certificate_code = generateCode();

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      user_id: user.id,
      course_id: courseId,
      certificate_code,
      certificate_url: null,
      is_valid: true
    })
    .select()
    .single();

  if (error) throw error;

  if (N8N_CERT_WEBHOOK) {
    try {
      await fetch(N8N_CERT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificate_id: data.id })
      });
    } catch (err) {
      console.error("Error notificando a n8n:", err);
    }
  } else {
    console.warn("VITE_N8N_CERT_WEBHOOK no configurado");
  }

  return data;
}