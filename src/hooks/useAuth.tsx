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
    console.log('🔄 useAuth - Checking auth status on mount...');
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔍 checkAuthStatus - token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.log('🔍 No token found, setting loading to false');
        setLoading(false);
        return;
      }

      console.log('🔍 Making request to getProfile...');
      const response = await authAPI.getProfile();
      console.log('🔍 Profile response:', response);
      
      if (response.success) {
        const userData = { id: response.user.id, email: response.user.email } as User;
        setUser(userData);
        setProfile(response.profile);
        setSession({ user: userData } as Session);
        console.log('✅ Auth state updated successfully:', {
          user: userData,
          profile: response.profile
        });
      } else {
        console.error('❌ Profile request failed:', response.error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('supabase.auth.token');
      }
    } catch (error) {
      console.error('🔍 Auth check failed:', error);
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
        fullName: fullName  // Changed from full_name to fullName
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
      console.log('🔐 useAuth - Starting sign in process...');
      const response = await authAPI.login({ email, password });
      console.log('🔐 useAuth - Login response:', response);
      
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('supabase.auth.token', JSON.stringify({ 
        access_token: response.token 
      }));
      
      const userData = { id: response.user.id, email: response.user.email } as User;
      setUser(userData);
      setProfile(response.profile);
      setSession({ user: userData } as Session);
      
      console.log('🔐 useAuth - Auth state updated:', {
        user: userData,
        profile: response.profile,
        session: { user: userData }
      });
      
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

  const refreshAuth = async () => {
    await checkAuthStatus();
  };

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshAuth
  };
}
