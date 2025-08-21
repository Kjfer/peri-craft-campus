import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CourseAccess {
  hasAccess: boolean;
  isPaid: boolean;
  enrollmentDate?: string;
  paymentStatus?: string;
  orderId?: string;
}

export function useCourseAccess(courseId: string): {
  access: CourseAccess | null;
  loading: boolean;
  error: string | null;
  refreshAccess: () => void;
} {
  const { user } = useAuth();
  const [access, setAccess] = useState<CourseAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = async () => {
    if (!user || !courseId) {
      setAccess({ hasAccess: false, isPaid: false });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Checking course access for:', { userId: user.id, courseId });

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role === 'admin') {
        console.log('✅ Admin access granted');
        setAccess({ hasAccess: true, isPaid: true });
        setLoading(false);
        return;
      }

      // Check for enrollment first - this is the primary access control
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('enrolled_at')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (enrollmentError) {
        console.error('❌ Error checking enrollment:', enrollmentError);
        setError('Error verificando acceso al curso');
        setLoading(false);
        return;
      }

      if (enrollment) {
        console.log('✅ Enrollment found, granting access');
        setAccess({
          hasAccess: true,
          isPaid: true,
          enrollmentDate: enrollment.enrolled_at
        });
        setLoading(false);
        return;
      }

      // If no enrollment, check if course is free
      const { data: course } = await supabase
        .from('courses')
        .select('price')
        .eq('id', courseId)
        .single();

      if (course?.price === 0) {
        console.log('📚 Free course, auto-enrolling user');
        // Free course - create enrollment
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({
            user_id: user.id,
            course_id: courseId,
            enrolled_at: new Date().toISOString()
          });

        if (enrollError) {
          console.error('❌ Error creating enrollment:', enrollError);
          setError('Error creando matrícula');
        } else {
          setAccess({ hasAccess: true, isPaid: true });
        }
        setLoading(false);
        return;
      }

      // No enrollment and course is paid - deny access
      console.log('❌ No enrollment found, access denied');
      setAccess({
        hasAccess: false,
        isPaid: false,
        paymentStatus: 'none'
      });

      setLoading(false);
    } catch (err) {
      console.error('❌ Error checking course access:', err);
      setError('Error verificando acceso al curso');
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, [user, courseId]);

  const refreshAccess = () => {
    checkAccess();
  };

  return { access, loading, error, refreshAccess };
}

export default useCourseAccess;
