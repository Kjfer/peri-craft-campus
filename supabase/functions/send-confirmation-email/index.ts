import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  fullName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: ConfirmationEmailRequest = await req.json();

    console.log('Sending confirmation email to:', email);

    // Crear cliente de Supabase con privilegios de admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Generar link de confirmación con redirect URL correcto (siempre usar producción)
    const productionUrl = 'https://peruemprende.lovable.app';
    const redirectUrl = `${productionUrl}/confirm-email`;
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (linkError) {
      console.error('Error generating confirmation link:', linkError);
      throw linkError;
    }

    const confirmUrl = linkData?.properties?.action_link || redirectUrl;
    console.log('Confirmation URL generated:', confirmUrl);

    const emailResponse = await resend.emails.send({
      from: "Peri Institute <onboarding@resend.dev>",
      to: [email],
      subject: "Confirma tu cuenta en Peri Institute",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirma tu cuenta</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a;">Peri Institute</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 20px 40px;">
                        <h2 style="margin: 0 0 20px; font-size: 22px; font-weight: 600; color: #1a1a1a;">
                          ¡Bienvenido${fullName ? ', ' + fullName : ''}!
                        </h2>
                        <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                          Gracias por registrarte en Peri Institute. Para completar tu registro y acceder a todos nuestros cursos, por favor confirma tu dirección de correo electrónico.
                        </p>
                        <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                          Haz clic en el botón de abajo para confirmar tu cuenta:
                        </p>
                        
                        <!-- Button -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td align="center" style="padding: 0 0 24px;">
                              <a href="${confirmUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                                Confirmar mi cuenta
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b6b6b;">
                          O copia y pega este enlace en tu navegador:
                        </p>
                        <p style="margin: 0 0 24px; font-size: 14px; line-height: 20px; color: #2563eb; word-break: break-all;">
                          ${confirmUrl}
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
                        
                        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b6b6b;">
                          Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 40px 40px; text-align: center;">
                        <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9b9b9b;">
                          © ${new Date().getFullYear()} Peri Institute. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, result: emailResponse }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
