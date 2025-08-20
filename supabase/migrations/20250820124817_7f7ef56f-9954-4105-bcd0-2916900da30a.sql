-- Fix lessons that are missing course_id by relating them through their module
UPDATE lessons 
SET course_id = modules.course_id 
FROM modules 
WHERE lessons.module_id = modules.id 
AND lessons.course_id IS NULL;