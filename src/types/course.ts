export interface Course {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  target_audience?: string;
  category: string[];
  level: string;
  instructor_name: string;
  duration_hours: number;
  price?: number;
  discounted_price?: number | null;
  thumbnail_url?: string;
  syllabus_pdf_url?: string;
  what_you_learn?: string[];
  requirements?: string[];
  featured?: boolean;
  is_active?: boolean;
  status?: 'active' | 'inactive' | 'draft';
  created_at?: string;
  updated_at?: string;
}