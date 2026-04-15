import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { api, getApiErrorMessage } from '../api/core';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const hasResetLink = Boolean(uid && token);

  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!hasResetLink) {
      setError('This password reset link is invalid or incomplete.');
      return;
    }

    if (newPassword !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/users/password_reset_confirm/', {
        uid,
        token,
        new_password: newPassword,
        password_confirm: passwordConfirm,
      });
      setMessage(
        response.data?.message ||
          'Password has been reset successfully. Please sign in with your new password.'
      );
      setNewPassword('');
      setPasswordConfirm('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to reset password with this link.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-600 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-800 shadow-xl">
        <h1 className="mb-1 text-2xl font-bold">Reset Password</h1>
        <p className="mb-6 text-sm text-slate-500">
          Choose a new password for your account.
        </p>

        {!hasResetLink ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            This password reset link is invalid or incomplete.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your new password"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Confirm New Password</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
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
            disabled={loading || !hasResetLink}
            className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
