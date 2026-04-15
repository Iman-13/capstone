import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/core';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/users/password_reset_request/', { identifier });
      setMessage(
        response.data?.message ||
          'If an account exists for that email or username, a password reset link has been sent.'
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to send password reset email right now.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-800 shadow-xl">
        <h1 className="mb-1 text-2xl font-bold">Forgot Password</h1>
        <p className="mb-6 text-sm text-slate-500">
          Enter the email address or username tied to your account. If we find a match, we&apos;ll send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email or Username</label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email or username"
              autoComplete="username"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Sending reset link...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
