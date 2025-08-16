// Configuration for API usage
export const APP_CONFIG = {
  // Set to true to use backend API, false to use Supabase directly
  USE_BACKEND_API: true,
  BACKEND_URL: 'http://localhost:3003',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).APP_CONFIG = APP_CONFIG;
}
