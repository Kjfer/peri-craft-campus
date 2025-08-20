import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useEnrollments = () => {
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchEnrollments = async () => {
    if (!user) {
      setEnrollments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching enrollments:', error);
        setEnrollments([]);
      } else {
        const courseIds = data?.map(enrollment => enrollment.course_id) || [];
        setEnrollments(courseIds);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [user]);

  const isEnrolled = (courseId: string) => {
    return enrollments.includes(courseId);
  };

  const refreshEnrollments = () => {
    fetchEnrollments();
  };

  return {
    enrollments,
    loading,
    isEnrolled,
    refreshEnrollments
  };
};
