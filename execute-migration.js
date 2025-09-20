// Script para ejecutar migración via API
// Archivo: execute-migration.js

const { createClient } = require('@supabase/supabase-js');

// Configuración (reemplaza con tus valores)
const supabaseUrl = 'https://tu-proyecto.supabase.co';
const supabaseServiceKey = 'tu-service-role-key'; // Service Role Key, NO anon key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  try {
    console.log('🚀 Ejecutando migración...');

    // 1. Agregar columna subscription_id
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE order_items 
        ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);
      `
    });
    console.log('✅ Columna subscription_id agregada');

    // 2. Agregar constraint
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE order_items 
        ADD CONSTRAINT IF NOT EXISTS check_course_or_subscription 
        CHECK (
            (course_id IS NOT NULL AND subscription_id IS NULL) OR 
            (course_id IS NULL AND subscription_id IS NOT NULL)
        );
      `
    });
    console.log('✅ Constraint agregado');

    // 3. Crear índices
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_order_items_subscription_id 
        ON order_items(subscription_id);
        
        CREATE INDEX IF NOT EXISTS idx_order_items_course_or_subscription 
        ON order_items(course_id, subscription_id);
      `
    });
    console.log('✅ Índices creados');

    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
  }
}

executeMigration();