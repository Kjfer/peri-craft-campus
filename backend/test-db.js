const { supabaseAdmin } = require('./config/database');

async function testDatabaseTables() {
  console.log('🔍 Testing database tables...');
  
  try {
    // Test cart_items table
    console.log('Testing cart_items table...');
    const { data: cartData, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select('*')
      .limit(1);
    
    if (cartError) {
      console.error('❌ cart_items table error:', cartError.message);
    } else {
      console.log('✅ cart_items table exists, rows:', cartData.length);
    }
    
    // Test orders table
    console.log('Testing orders table...');
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .limit(1);
    
    if (orderError) {
      console.error('❌ orders table error:', orderError.message);
    } else {
      console.log('✅ orders table exists, rows:', orderData.length);
    }
    
    // Test courses table
    console.log('Testing courses table...');
    const { data: courseData, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, price')
      .limit(5);
    
    if (courseError) {
      console.error('❌ courses table error:', courseError.message);
    } else {
      console.log('✅ courses table exists, rows:', courseData.length);
      courseData.forEach(course => {
        console.log(`  - ${course.title} (${course.id}) - $${course.price}`);
      });
    }
    
  } catch (error) {
    console.error('🚨 Database test failed:', error);
  }
}

testDatabaseTables();
