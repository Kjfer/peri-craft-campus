import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { authAPI } from "@/lib/api";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'student' | 'admin' | 'instructor';
  phone?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authAPI.getProfile();
      setUser({ id: response.user.id, email: response.user.email } as User);
      setProfile(response.profile);
      setSession({ user: { id: response.user.id, email: response.user.email } } as Session);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('supabase.auth.token');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await authAPI.register({
        email,
        password,
        full_name: fullName
      });
      
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('supabase.auth.token', JSON.stringify({ 
        access_token: response.token 
      }));
      
      const userData = { id: response.user.id, email: response.user.email } as User;
      setUser(userData);
      setProfile(response.profile);
      setSession({ user: userData } as Session);
      
      return { error: null };
    } catch (error: unknown) {
      console.error('SignUp error:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: { message } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('supabase.auth.token', JSON.stringify({ 
        access_token: response.token 
      }));
      
      const userData = { id: response.user.id, email: response.user.email } as User;
      setUser(userData);
      setProfile(response.profile);
      setSession({ user: userData } as Session);
      
      return { error: null };
    } catch (error: unknown) {
      console.error('SignIn error:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: { message } };
    }
  };

  const signOut = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('SignOut error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('supabase.auth.token');
      setUser(null);
      setProfile(null);
      setSession(null);
    }
    
    return { error: null };
  };

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut
  };
}
