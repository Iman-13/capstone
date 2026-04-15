import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      setLoading(false);

      if (!result || typeof result !== 'object') {
        setError('Login service error. Please try again.');
        return;
      }

      if (!result.success) {
        setError(result.message || 'Login failed. Please try again.');
        return;
      }
    } catch (err) {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem('afn_user') || '{}');
    navigate(storedUser?.role ? '/' : '/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-800 shadow-xl">
        <h1 className="mb-1 text-2xl font-bold">AFN Service Management</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in with your username or email.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Username or Email</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your username or email"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            <div className="mt-2 text-right">
              <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
