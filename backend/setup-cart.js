const { supabaseAdmin } = require('./config/database');

async function setupCartTables() {
  try {
    console.log('🔧 Setting up cart system...');
    
    // First, let's check if courses exist
    console.log('Checking courses table...');
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id, title, price')
      .limit(5);
    
    if (coursesError) {
      console.error('❌ Courses table error:', coursesError);
      return;
    }
    
    console.log(`✅ Found ${courses.length} courses`);
    if (courses.length === 0) {
      console.log('⚠️ No courses found. Let\'s create some test courses first...');
      
      const testCourses = [
        {
          title: 'Curso de Diseño de Moda',
          description: 'Aprende los fundamentos del diseño de moda',
          price: 99.99,
          instructor_name: 'Ana García',
          level: 'beginner',
          duration_hours: 40,
          category: 'design',
          is_active: true
        },
        {
          title: 'Patronaje Avanzado',
          description: 'Técnicas avanzadas de patronaje',
          price: 149.99,
          instructor_name: 'Carlos Rodriguez',
          level: 'advanced',
          duration_hours: 60,
          category: 'pattern-making',
          is_active: true
        }
      ];
      
      const { data: newCourses, error: createError } = await supabaseAdmin
        .from('courses')
        .insert(testCourses)
        .select();
      
      if (createError) {
        console.error('❌ Error creating test courses:', createError);
      } else {
        console.log(`✅ Created ${newCourses.length} test courses`);
      }
    }
    
    // Check if cart_items table exists by trying to select from it
    console.log('Checking cart_items table...');
    const { data: cartTest, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select('*')
      .limit(1);
    
    if (cartError) {
      console.log('⚠️ cart_items table doesn\'t exist. This means we need to run the migrations.');
      console.log('❌ Cart table error:', cartError.message);
      
      // Provide instructions for manual setup
      console.log('\n📋 MANUAL SETUP REQUIRED:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Go to SQL Editor');
      console.log('3. Run the migration file: supabase/migrations/20250816230000_create_cart_system.sql');
      console.log('4. Or run these commands:');
      console.log(`
-- Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own cart items" 
ON public.cart_items FOR ALL 
USING (auth.uid() = user_id);
      `);
      
      return;
    } else {
      console.log('✅ cart_items table exists');
    }
    
    console.log('🎉 Cart system is ready!');
    
  } catch (error) {
    console.error('🚨 Setup failed:', error);
  }
}

setupCartTables();
