import { useAuth } from '@/contexts/AuthContext';

export function AuthDebug() {
  const { user, profile, loading, session } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">Auth Debug:</h4>
      <div className="space-y-1">
        <div>Loading: {loading ? 'true' : 'false'}</div>
        <div>User: {user ? `${user.email} (${user.id})` : 'null'}</div>
        <div>Profile: {profile ? `${profile.full_name} (${profile.role})` : 'null'}</div>
        <div>Session: {session ? 'exists' : 'null'}</div>
        <div>User ID: {user?.id || 'none'}</div>
        <div>Email Confirmed: {user?.email_confirmed_at ? 'yes' : 'no'}</div>
      </div>
    </div>
  );
}
