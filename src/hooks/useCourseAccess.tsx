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
        .select('price, is_free')
        .eq('id', courseId)
        .single();

      if (course?.is_free || course?.price === 0) {
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
              enrolled_at: new Date().toISOString(),
              payment_status: 'free'
            });
        }

        setAccess({ hasAccess: true, isPaid: true });
        setLoading(false);
        return;
      }

      // Check for paid enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          *,
          orders!inner (
            id,
            payment_status,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('orders.payment_status', 'completed')
        .single();

      if (enrollmentError && enrollmentError.code !== 'PGRST116') {
        console.error('Error checking enrollment:', enrollmentError);
        setError('Error verificando acceso al curso');
        setLoading(false);
        return;
      }

      if (enrollment) {
        setAccess({
          hasAccess: true,
          isPaid: true,
          enrollmentDate: enrollment.enrolled_at,
          paymentStatus: enrollment.orders.payment_status,
          orderId: enrollment.orders.id
        });
      } else {
        // Check for pending payments
        const { data: pendingOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .eq('payment_status', 'pending')
          .contains('order_items', [{ course_id: courseId }])
          .single();

        setAccess({
          hasAccess: false,
          isPaid: false,
          paymentStatus: pendingOrder ? 'pending' : 'none'
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
