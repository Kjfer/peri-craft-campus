const { supabaseAdmin } = require('./config/database');

async function createTestCourses() {
  try {
    console.log('🔧 Creating test courses...');
    
    // Check if courses already exist
    const { data: existingCourses, error: checkError } = await supabaseAdmin
      .from('courses')
      .select('id, title')
      .limit(5);
    
    if (checkError) {
      console.error('❌ Error checking existing courses:', checkError);
      return;
    }
    
    console.log(`✅ Found ${existingCourses.length} existing courses`);
    
    if (existingCourses.length >= 3) {
      console.log('Enough courses already exist:');
      existingCourses.forEach(course => {
        console.log(`  - ${course.title} (${course.id})`);
      });
      return;
    }
    
    const testCourses = [
      {
        title: 'Curso de Diseño de Moda',
        description: 'Aprende los fundamentos del diseño de moda desde cero',
        price: 99.99,
        instructor_name: 'Ana García',
        level: 'beginner',
        duration_hours: 40,
        category: 'design',
        is_active: true,
        thumbnail_url: '/placeholder.svg'
      },
      {
        title: 'Patronaje Avanzado',
        description: 'Técnicas avanzadas de patronaje para profesionales',
        price: 149.99,
        instructor_name: 'Carlos Rodriguez',
        level: 'advanced',
        duration_hours: 60,
        category: 'pattern-making',
        is_active: true,
        thumbnail_url: '/placeholder.svg'
      },
      {
        title: 'Costura Básica',
        description: 'Aprende las técnicas básicas de costura',
        price: 79.99,
        instructor_name: 'María López',
        level: 'beginner',
        duration_hours: 30,
        category: 'sewing',
        is_active: true,
        thumbnail_url: '/placeholder.svg'
      }
    ];
    
    const { data: newCourses, error: createError } = await supabaseAdmin
      .from('courses')
      .insert(testCourses)
      .select();
    
    if (createError) {
      console.error('❌ Error creating test courses:', createError);
    } else {
      console.log(`✅ Created ${newCourses.length} test courses:`);
      newCourses.forEach(course => {
        console.log(`  - ${course.title} (${course.id}) - $${course.price}`);
      });
    }
    
  } catch (error) {
    console.error('🚨 Error:', error);
  }
}

createTestCourses();
