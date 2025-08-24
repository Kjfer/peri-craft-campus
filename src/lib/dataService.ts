import { courseAPI, enrollmentAPI, certificateAPI } from '@/lib/api';
import type { Course } from '@/types/course';

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'active' | 'completed' | 'cancelled';
  progress: number;
  enrolled_at: string;
}

// Courses service
export const coursesService = {
  // Get all courses with filters
  getCourses: async (filters: {
    category?: string;
    level?: string;
    search?: string;
    instructor?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    try {
      const response = await courseAPI.getAll(filters);
      return { data: response.courses || [], error: null };
    } catch (error: any) {
      return { data: [], error: { message: error.message } };
    }
  },

  // Get single course by ID
  getCourse: async (id: string) => {
    try {
      const response = await courseAPI.getById(id);
      return { data: response.course, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  },

  // Get course categories
  getCategories: async () => {
    try {
      const response = await courseAPI.getCategories();
      return { data: response.categories || [], error: null };
    } catch (error: any) {
      return { data: [], error: { message: error.message } };
    }
  }
};

// Enrollments service
export const enrollmentService = {
  // Enroll in a course
  enrollInCourse: async (courseId: string) => {
    try {
      const response = await enrollmentAPI.create(courseId);
      return { data: response.enrollment, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  },

  // Get user enrollments
  getUserEnrollments: async () => {
    try {
      const response = await enrollmentAPI.getByUser();
      return { data: response.enrollments || [], error: null };
    } catch (error: any) {
      return { data: [], error: { message: error.message } };
    }
  },

  // Get enrollments for a course
  getCourseEnrollments: async (courseId: string) => {
    try {
      const response = await enrollmentAPI.getByCourse(courseId);
      return { data: response.enrollments || [], error: null };
    } catch (error: any) {
      return { data: [], error: { message: error.message } };
    }
  }
};

// Certificates service
export const certificateService = {
  // Verify a certificate
  verifyCertificate: async (code: string) => {
    try {
      const response = await certificateAPI.verify(code);
      return { data: response.certificate, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  },

  // Get user certificates
  getUserCertificates: async () => {
    try {
      const response = await certificateAPI.getByUser();
      return { data: response.certificates || [], error: null };
    } catch (error: any) {
      return { data: [], error: { message: error.message } };
    }
  }
};

// Legacy compatibility functions (mantener la misma interfaz que Supabase)
export const supabaseService = {
  // Simulate supabase.from('courses').select()
  from: (table: string) => ({
    select: (fields = '*') => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          if (table === 'courses') {
            return await coursesService.getCourse(value);
          }
          return { data: null, error: null };
        }
      }),
      // Otros métodos que se puedan necesitar
      order: (column: string, options: any = {}) => ({
        limit: (count: number) => ({
          execute: async () => {
            if (table === 'courses') {
              return await coursesService.getCourses({ limit: count });
            }
            return { data: [], error: null };
          }
        })
      })
    })
  })
};

export default {
  coursesService,
  enrollmentService,
  certificateService,
  supabaseService
};
