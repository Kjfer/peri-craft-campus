-- Add target_audience field to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_audience text;