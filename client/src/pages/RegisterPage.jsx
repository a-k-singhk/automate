import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerUser(username.trim(), password);
      navigate('/chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-primary/8 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Neon Chat
          </h1>
          <p className="text-text-muted mt-2 text-sm">Create your account to get started</p>
        </div>

        {/* Card */}
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl shadow-accent/5">
          <h2 className="text-xl font-semibold mb-6">Create Account</h2>

          {error && (
            <div className="mb-4 bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-3 rounded-lg animate-fade-in-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-username" className="text-xs text-text-muted uppercase tracking-wide font-medium">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username (min 3 chars)"
                autoComplete="username"
                className="w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-xs text-text-muted uppercase tracking-wide font-medium">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 chars)"
                autoComplete="new-password"
                className="w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-confirm" className="text-xs text-text-muted uppercase tracking-wide font-medium">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                className="w-full bg-surface2 border border-border rounded-lg px-4 py-3 text-sm text-text placeholder-text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              id="register-btn"
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent/80 text-white font-semibold py-3 rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent/80 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
