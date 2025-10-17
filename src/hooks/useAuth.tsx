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

  const signUp = async (email: string, password: string, fullName: string, phone?: string, country?: string, dateOfBirth?: string) => {
    try {
      console.log('📝 [SIGNUP] Starting signup for:', email);
      
      // Deshabilitar el email automático de Supabase y enviar nuestro propio email con Resend
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
            country: country || null,
            date_of_birth: dateOfBirth || null
          },
          emailRedirectTo: `${window.location.origin}/confirm-email`
        }
      });
      
      console.log('📝 [SIGNUP] Supabase response:', { 
        hasData: !!data, 
        hasUser: !!data?.user, 
        userId: data?.user?.id,
        hasSession: !!data?.session,
        error: error 
      });
      
      if (error) throw error;
      
      // Enviar correo de confirmación con Resend
      if (data.user) {
        const userEmail = data.user.email;
        const userName = data.user.user_metadata?.full_name || fullName;
        
        console.log('📧 [SIGNUP] Sending confirmation email via Resend');
        console.log('📧 [SIGNUP] Target email:', userEmail);
        console.log('📧 [SIGNUP] Full name:', userName);
        
        try {
          const response = await supabase.functions.invoke('send-confirmation-email', {
            body: {
              email: userEmail,
              fullName: userName,
            },
          });
          
          console.log('📧 [SIGNUP] Function response:', response);
          
          if (response.error) {
            console.error('❌ [SIGNUP] Edge function error:', response.error);
          } else {
            console.log('✅ [SIGNUP] Confirmation email sent successfully via Resend!');
          }
        } catch (emailError) {
          console.error('❌ [SIGNUP] Exception invoking edge function:', emailError);
        }
      }
      
      console.log('✅ [SIGNUP] Signup process completed - user must confirm email from inbox');
      return { data, error: null };
    } catch (error: unknown) {
      console.error('❌ [SIGNUP] Signup error:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: { message } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in user:', email);
      setLoading(true);

      // Clean limbo auth state before attempting sign-in
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage || {}).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
        await supabase.auth.signOut({ scope: 'global' } as any);
      } catch (_) {
        // ignore cleanup errors
      }
      
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = (error as any)?.message || '';
        const needsConfirm = msg.toLowerCase().includes('email not confirmed');
        if (needsConfirm) {
          console.log('📧 Email not confirmed, attempting auto-confirm via edge function...');
          try {
            const { data: confirmRes, error: confirmErr } = await supabase.functions.invoke('confirm-email-dev', {
              body: { email },
            });
            if (confirmErr) {
              console.warn('Auto-confirm failed:', confirmErr);
              throw new Error('Tu email no está confirmado. Usa la herramienta "Confirmar Email" o revisa tu bandeja.');
            }
            // Retry sign-in after short delay
            await new Promise((r) => setTimeout(r, 800));
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (retry.error) {
              throw retry.error;
            }
            console.log('✅ Login successful after auto-confirm');
            return { data: retry.data, error: null };
          } catch (autoErr: any) {
            console.error('❌ Auto-confirm sign-in error:', autoErr);
            const message = autoErr?.message || 'Tu email no está confirmado.';
            return { error: { message } };
          }
        }
        // Other errors
        throw error;
      }

      console.log('✅ Login successful');
      return { data, error: null };
    } catch (error: unknown) {
      console.error('❌ SignIn error:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return { error: { message } };
    } finally {
      // Let onAuthStateChange drive loading to false
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