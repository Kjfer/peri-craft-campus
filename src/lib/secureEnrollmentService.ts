import { supabase } from "@/integrations/supabase/client";

interface EnrollmentResult {
  success: boolean;
  message: string;
  enrollment?: any;
  rateLimited?: boolean;
}

export class SecureEnrollmentService {
  /**
   * Securely enroll a user in a course with rate limiting and audit logging
   */
  static async enrollUser(courseId: string): Promise<EnrollmentResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: "User must be authenticated to enroll"
        };
      }

      // Check rate limiting first
      const rateLimitCheck = await this.checkRateLimit(user.id, courseId);
      if (!rateLimitCheck) {
        // Log failed attempt
        await this.logEnrollmentAttempt(user.id, courseId, false, "Rate limited");
        
        return {
          success: false,
          message: "Too many enrollment attempts. Please try again later.",
          rateLimited: true
        };
      }

      // Check if user already enrolled
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (existingEnrollment) {
        await this.logEnrollmentAttempt(user.id, courseId, true, "Already enrolled");
        return {
          success: true,
          message: "Already enrolled in this course",
          enrollment: existingEnrollment
        };
      }

      // Check course access (free course or paid access)
      const hasAccess = await this.checkCourseAccess(user.id, courseId);
      if (!hasAccess) {
        await this.logEnrollmentAttempt(user.id, courseId, false, "No access to course");
        return {
          success: false,
          message: "You don't have access to this course. Please purchase it first."
        };
      }

      // Create enrollment
      const { data: enrollment, error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId
        })
        .select()
        .single();

      if (error) {
        console.error('Enrollment error:', error);
        await this.logEnrollmentAttempt(user.id, courseId, false, `Database error: ${error.message}`);
        return {
          success: false,
          message: "Failed to enroll in course. Please try again."
        };
      }

      // Log successful enrollment
      await this.logEnrollmentAttempt(user.id, courseId, true, "Successful enrollment");

      return {
        success: true,
        message: "Successfully enrolled in course",
        enrollment
      };

    } catch (error) {
      console.error('Secure enrollment error:', error);
      return {
        success: false,
        message: "An error occurred during enrollment"
      };
    }
  }

  /**
   * Check if user has exceeded rate limits
   */
  private static async checkRateLimit(userId: string, courseId: string): Promise<boolean> {
    try {
      // Use the database function for rate limiting
      const { data, error } = await supabase
        .rpc('check_enrollment_rate_limit', {
          p_user_id: userId,
          p_course_id: courseId
        });

      if (error) {
        console.error('Rate limit check error:', error);
        // Allow enrollment if rate limit check fails (fail open for user experience)
        return true;
      }

      return data === true;
    } catch (error) {
      console.error('Rate limit check exception:', error);
      return true; // Fail open
    }
  }

  /**
   * Check if user has access to the course
   */
  private static async checkCourseAccess(userId: string, courseId: string): Promise<boolean> {
    try {
      // Check if course is free
      const { data: course } = await supabase
        .from('courses')
        .select('price')
        .eq('id', courseId)
        .single();

      if (course?.price === 0) {
        return true; // Free course
      }

      // Check if user already has an enrollment (created by external payment sync)
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (enrollment) {
        return true; // User already enrolled
      }

      // Check if user has active subscription that includes this course
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          status,
          end_date,
          plans (
            all_courses_included,
            plan_courses (
              course_id
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .limit(1);

      if (subscription && subscription.length > 0) {
        const plan = subscription[0].plans;
        if (plan.all_courses_included) {
          return true; // Plan includes all courses
        }
        
        // Check if course is specifically included in plan
        const courseIncluded = plan.plan_courses?.some(
          (pc: any) => pc.course_id === courseId
        );
        if (courseIncluded) {
          return true;
        }
      }

      return false; // No access found
    } catch (error) {
      console.error('Course access check error:', error);
      return false; // Fail closed for security
    }
  }

  /**
   * Log enrollment attempt for security monitoring
   */
  private static async logEnrollmentAttempt(
    userId: string, 
    courseId: string, 
    success: boolean, 
    reason?: string
  ): Promise<void> {
    try {
      await supabase
        .from('enrollment_attempts')
        .insert({
          user_id: userId,
          course_id: courseId,
          success,
          ip_address: this.getClientIP()
        });
    } catch (error) {
      console.error('Failed to log enrollment attempt:', error);
      // Don't throw error - logging failure shouldn't block enrollment
    }
  }

  /**
   * Get client IP address (basic implementation)
   */
  private static getClientIP(): string | null {
    // In a real implementation, this would be handled by the backend
    // For now, we'll return null as this is frontend code
    return null;
  }

  /**
   * Get enrollment statistics for a user
   */
  static async getUserEnrollmentStats(userId: string) {
    try {
      const { data: attempts } = await supabase
        .from('enrollment_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('attempted_at', { ascending: false })
        .limit(100);

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', userId);

      return {
        totalAttempts: attempts?.length || 0,
        successfulEnrollments: enrollments?.length || 0,
        recentAttempts: attempts?.slice(0, 10) || []
      };
    } catch (error) {
      console.error('Error fetching enrollment stats:', error);
      return {
        totalAttempts: 0,
        successfulEnrollments: 0,
        recentAttempts: []
      };
    }
  }
}