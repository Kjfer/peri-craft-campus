-- Crear función para actualizar el progreso del enrollment cuando se actualiza course_progress
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course_id UUID;
  v_total_lessons INT;
  v_completed_lessons INT;
  v_progress_percentage INT;
BEGIN
  -- Obtener el course_id desde la lección
  SELECT course_id INTO v_course_id
  FROM lessons
  WHERE id = NEW.lesson_id;

  -- Contar total de lecciones del curso
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons
  WHERE course_id = v_course_id;

  -- Contar lecciones completadas por el usuario
  SELECT COUNT(*) INTO v_completed_lessons
  FROM course_progress cp
  JOIN lessons l ON l.id = cp.lesson_id
  WHERE l.course_id = v_course_id
    AND cp.user_id = NEW.user_id
    AND cp.completed = true;

  -- Calcular porcentaje de progreso
  IF v_total_lessons > 0 THEN
    v_progress_percentage := ROUND((v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100);
  ELSE
    v_progress_percentage := 0;
  END IF;

  -- Actualizar el enrollment con el nuevo progreso
  UPDATE enrollments
  SET 
    progress_percentage = v_progress_percentage,
    completed_at = CASE 
      WHEN v_progress_percentage = 100 THEN NOW()
      ELSE completed_at
    END
  WHERE user_id = NEW.user_id
    AND course_id = v_course_id;

  RETURN NEW;
END;
$$;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON course_progress;

-- Crear trigger que se ejecuta después de INSERT o UPDATE en course_progress
CREATE TRIGGER trigger_update_enrollment_progress
  AFTER INSERT OR UPDATE OF completed ON course_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_progress();

-- Recalcular progreso para todos los enrollments existentes
DO $$
DECLARE
  enrollment_record RECORD;
  v_total_lessons INT;
  v_completed_lessons INT;
  v_progress_percentage INT;
BEGIN
  FOR enrollment_record IN 
    SELECT e.id, e.user_id, e.course_id 
    FROM enrollments e
  LOOP
    -- Contar total de lecciones del curso
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons
    WHERE course_id = enrollment_record.course_id;

    -- Contar lecciones completadas por el usuario
    SELECT COUNT(*) INTO v_completed_lessons
    FROM course_progress cp
    JOIN lessons l ON l.id = cp.lesson_id
    WHERE l.course_id = enrollment_record.course_id
      AND cp.user_id = enrollment_record.user_id
      AND cp.completed = true;

    -- Calcular porcentaje de progreso
    IF v_total_lessons > 0 THEN
      v_progress_percentage := ROUND((v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100);
    ELSE
      v_progress_percentage := 0;
    END IF;

    -- Actualizar el enrollment
    UPDATE enrollments
    SET 
      progress_percentage = v_progress_percentage,
      completed_at = CASE 
        WHEN v_progress_percentage = 100 THEN NOW()
        ELSE completed_at
      END
    WHERE id = enrollment_record.id;
  END LOOP;
END;
$$;