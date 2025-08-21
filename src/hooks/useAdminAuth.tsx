import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useAdminAuth() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) {
      navigate('/auth');
    }
  }, [user, profile, loading, navigate]);

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin'
  };
}