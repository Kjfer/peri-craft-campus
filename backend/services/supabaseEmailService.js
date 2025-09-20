const { createClient } = require('@supabase/supabase-js');

class SupabaseEmailService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Enviar email usando las plantillas de Supabase Auth
  async sendCustomEmail(userEmail, templateType, templateData) {
    try {
      // Nota: Esto requiere configuración especial en Supabase
      const { data, error } = await this.supabase.auth.admin.generateLink({
        type: 'signup',
        email: userEmail,
        options: {
          data: templateData
        }
      });

      if (error) {
        console.error('Supabase email error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error with Supabase email:', error);
      return false;
    }
  }
}

module.exports = new SupabaseEmailService();