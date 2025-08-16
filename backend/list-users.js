const { supabaseAdmin } = require('./config/database');

async function listUsers() {
  try {
    console.log('🔍 Fetching users from Supabase Auth...');
    
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log(`✅ Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('   ---');
    });
    
    // Also check profiles table
    console.log('\n🔍 Checking profiles table...');
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*');
    
    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
    } else {
      console.log(`✅ Found ${profiles.length} profiles:`);
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.full_name} (${profile.email}) - Role: ${profile.role}`);
      });
    }
    
  } catch (error) {
    console.error('🚨 Error:', error);
  }
}

listUsers();
