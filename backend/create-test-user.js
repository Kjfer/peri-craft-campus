const { supabaseAdmin } = require('./config/database');

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@test.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Usuario de Prueba'
      }
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    
    console.log('User created in auth:', authData.user.id);
    
    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        user_id: authData.user.id,
        email: authData.user.email,
        full_name: 'Usuario de Prueba',
        role: 'student',
        phone: null,
        country: null
      }])
      .select()
      .single();
    
    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }
    
    console.log('Profile created:', profile);
    console.log('Test user ready: test@test.com / password123');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
