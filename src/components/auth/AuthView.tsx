import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthViewProps {
  onAuthSuccess: () => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [kennelName, setKennelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          setMessage('Login successful!');
          setTimeout(() => onAuthSuccess(), 1000);
        }
      } else {
        // Sign up
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }

        if (!kennelName.trim()) {
          setError('Kennel name is required');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              kennel_name: kennelName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          setMessage('Account created! You can now log in.');
          setIsLogin(true);
          setPassword('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-kennel-100 to-earth-100 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-kennel-700 mb-2">
            🐾 Paws & Pedigrees
          </h1>
          <p className="text-earth-600">
            {isLogin ? 'Welcome back!' : 'Start your kennel journey'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-earth-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kennel-500"
                  placeholder="Enter username"
                  required={!isLogin}
                />
                <p className="text-xs text-earth-500 mt-1">
                  Your player name - visible to other players
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-earth-700 mb-2">
                  Kennel Name
                </label>
                <input
                  type="text"
                  value={kennelName}
                  onChange={(e) => setKennelName(e.target.value)}
                  className="w-full px-4 py-2 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kennel-500"
                  placeholder="e.g., Sunshine Kennels"
                  required={!isLogin}
                />
                <p className="text-xs text-earth-500 mt-1">
                  Your kennel's name - shown in your profile
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-earth-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kennel-500"
              placeholder="Enter email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-kennel-500"
              placeholder="Enter password"
              required
              minLength={6}
            />
            {!isLogin && (
              <p className="text-xs text-earth-500 mt-1">
                Must be at least 6 characters
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-kennel-600 text-white py-3 rounded-lg font-bold hover:bg-kennel-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="text-kennel-600 hover:text-kennel-700 font-medium"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Log in'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-earth-200">
          <p className="text-xs text-earth-500 text-center">
            Your progress will be saved to the cloud and synced across devices
          </p>
        </div>
      </div>
    </div>
  );
}
