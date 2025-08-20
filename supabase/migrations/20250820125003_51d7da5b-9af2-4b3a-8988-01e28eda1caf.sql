-- Normalize lessons: set missing course_id via module and avoid unique conflicts by re-numbering per course starting after existing max
WITH existing_max AS (
  SELECT course_id, MAX(order_number) AS max_ord
  FROM lessons
  WHERE course_id IS NOT NULL
  GROUP BY course_id
), to_fix AS (
  SELECT l.id,
         m.course_id,
         ROW_NUMBER() OVER (PARTITION BY m.course_id ORDER BY m.order_number, l.order_number, l.created_at, l.id) AS rn
  FROM lessons l
  JOIN modules m ON l.module_id = m.id
  WHERE l.course_id IS NULL
), computed AS (
  SELECT t.id,
         t.course_id,
         COALESCE(e.max_ord, 0) + t.rn AS new_order
  FROM to_fix t
  LEFT JOIN existing_max e ON e.course_id = t.course_id
)
UPDATE lessons AS l
SET course_id = c.course_id,
    order_number = c.new_order
FROM computed c
WHERE l.id = c.id;
