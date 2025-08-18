import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3003/api/enrollments/my-courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEnrollments(data.courseIds || []);
      } else {
        console.error('Failed to fetch enrollments');
        setEnrollments([]);
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
