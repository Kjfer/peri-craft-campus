-- Add status column to courses table
-- This will provide more granular control over course states

-- Create an enum for course status
CREATE TYPE public.course_status AS ENUM ('active', 'inactive', 'draft');

-- Add status column to courses table
ALTER TABLE public.courses 
ADD COLUMN status course_status DEFAULT 'active';

-- Update existing courses to have 'active' status based on is_active
UPDATE public.courses 
SET status = CASE 
  WHEN is_active = true THEN 'active'::course_status 
  ELSE 'inactive'::course_status 
END;

-- Add a comment to explain the column
COMMENT ON COLUMN public.courses.status IS 'Course status: active (published and visible), inactive (published but hidden), draft (unpublished)';
