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

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setAccess({ hasAccess: true, isPaid: true });
        setLoading(false);
        return;
      }

      // Check if course is free
      const { data: course } = await supabase
        .from('courses')
        .select('price')
        .eq('id', courseId)
        .single();

      if (course?.price === 0) {
        // Free course - create enrollment if not exists
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();

        if (!enrollment) {
          await supabase
            .from('enrollments')
            .insert({
              user_id: user.id,
              course_id: courseId,
              enrolled_at: new Date().toISOString()
            });
        }

        setAccess({ hasAccess: true, isPaid: true });
        setLoading(false);
        return;
      }

      // Check for enrollment first
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (enrollmentError && enrollmentError.code !== 'PGRST116') {
        console.error('Error checking enrollment:', enrollmentError);
        setError('Error verificando acceso al curso');
        setLoading(false);
        return;
      }

      if (enrollment) {
        // Check if there's a completed payment for this course
        const { data: completedPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('payment_status', 'completed')
          .single();

        if (completedPayment) {
          setAccess({
            hasAccess: true,
            isPaid: true,
            enrollmentDate: enrollment.enrolled_at,
            paymentStatus: completedPayment.payment_status,
            orderId: completedPayment.id
          });
        } else {
          setAccess({
            hasAccess: false,
            isPaid: false,
            paymentStatus: 'none'
          });
        }
      } else {
        // Check for pending payments
        const { data: pendingPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('payment_status', 'pending')
          .single();

        setAccess({
          hasAccess: false,
          isPaid: false,
          paymentStatus: pendingPayment ? 'pending' : 'none'
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error checking course access:', err);
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
