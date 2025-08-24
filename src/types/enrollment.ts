import type { Course } from './course';

export interface Enrollment {
  id: string;
  user_id?: string;
  course_id?: string;
  enrolled_at: string;
  completed_at?: string;
  progress_percentage: number;
  courses?: Course;
  course?: Course;
}