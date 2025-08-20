import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    console.log('🔄 useAuth - Setting up auth listener...');
    let isMounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id);
        
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          // Defer profile fetch to avoid deadlocks
          setTimeout(async () => {
            if (!isMounted) return;
            
            console.log('👤 User authenticated, fetching profile...');
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              if (!isMounted) return;
              
              if (error) {
                console.error('❌ Profile fetch failed:', error);
                setProfile(null);
              } else {
                console.log('✅ Profile loaded:', profileData);
                setProfile(profileData);
              }
            } catch (error) {
              console.error('❌ Unexpected error fetching profile:', error);
              if (isMounted) setProfile(null);
            } finally {
              if (isMounted) setLoading(false);
            }
          }, 0);
        } else {
          console.log('🚪 User logged out');
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false);
        }
      }
    );

    // Initial session check
    const getInitialSession = async () => {
      if (!isMounted) return;
      
      console.log('🔍 Checking initial session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          setLoading(false);
          return;
        }
        
        // Let the auth state change listener handle the session
        if (!session) {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Unexpected error during initial session check:', error);
        if (isMounted) setLoading(false);
      }
    };
    
    getInitialSession();

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('📝 Signing up user:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
      
      console.log('✅ Signup successful');
      return { error: null };
    } catch (error: unknown) {
      console.error('❌ SignUp error:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: { message } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in user:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      console.log('✅ Login successful');
      return { error: null };
    } catch (error: unknown) {
      console.error('❌ SignIn error:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: { message } };
    } finally {
      // Don't set loading to false here - let the auth state change handle it
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out user');
      
      // Clear auth state first
      setUser(null);
      setProfile(null);
      setSession(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('✅ Logout successful');
      return { error: null };
    } catch (error) {
      console.error('❌ SignOut error:', error);
      return { error: null }; // Return success even if error to ensure cleanup
    }
  };

  const refreshAuth = async () => {
    console.log('🔄 Refreshing auth...');
    const { data: { session } } = await supabase.auth.getSession();
    // The auth state change listener will handle this automatically
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