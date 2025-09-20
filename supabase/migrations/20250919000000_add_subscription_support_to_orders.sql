-- Migration: Add subscription support to order_items (Safe version)
-- Date: 2025-09-19
-- Description: Permite que order_items soporte tanto cursos como suscripciones

BEGIN;

-- 1. Agregar columna subscription_id solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE order_items ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
        RAISE NOTICE 'Added subscription_id column to order_items';
    ELSE
        RAISE NOTICE 'Column subscription_id already exists in order_items';
    END IF;
END $$;

-- 2. Agregar constraint solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_course_or_subscription' 
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE order_items 
        ADD CONSTRAINT check_course_or_subscription 
        CHECK (
            (course_id IS NOT NULL AND subscription_id IS NULL) OR 
            (course_id IS NULL AND subscription_id IS NOT NULL)
        );
        RAISE NOTICE 'Added check_course_or_subscription constraint';
    ELSE
        RAISE NOTICE 'Constraint check_course_or_subscription already exists';
    END IF;
END $$;

-- 3. Crear índices solo si no existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_order_items_subscription_id'
    ) THEN
        CREATE INDEX idx_order_items_subscription_id ON order_items(subscription_id);
        RAISE NOTICE 'Created index idx_order_items_subscription_id';
    ELSE
        RAISE NOTICE 'Index idx_order_items_subscription_id already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_order_items_course_or_subscription'
    ) THEN
        CREATE INDEX idx_order_items_course_or_subscription ON order_items(course_id, subscription_id);
        RAISE NOTICE 'Created index idx_order_items_course_or_subscription';
    ELSE
        RAISE NOTICE 'Index idx_order_items_course_or_subscription already exists';
    END IF;
END $$;

-- 4. Agregar comentarios para documentación
COMMENT ON TABLE order_items IS 'Items de órdenes - soporta cursos y suscripciones';
COMMENT ON COLUMN order_items.course_id IS 'ID del curso (NULL si es suscripción)';
COMMENT ON COLUMN order_items.subscription_id IS 'ID de la suscripción (NULL si es curso)';

-- 5. Actualizar RLS policies si existen
-- (Verificar y ajustar según tus políticas actuales)

COMMIT;