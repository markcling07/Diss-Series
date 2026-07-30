'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'That username or password didn’t match.');
      }

      if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/profile');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="panel">
        <div className="auth-head">
          <span className="eyebrow">Sign in</span>
          <h1 className="auth-title">Welcome back.</h1>
          <p className="auth-sub">Pick up where your uploads left off.</p>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-id">
              Username or email
            </label>
            <div className="field">
              <User size={16} className="field-icon" />
              <input
                id="login-id"
                type="text"
                required
                className="form-input"
                placeholder="you@example.com"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="field">
              <Lock size={16} className="field-icon" />
              <input
                id="login-password"
                type="password"
                required
                className="form-input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-foot">
          No account yet?{' '}
          <Link href="/register" className="link-accent">
            Create one
          </Link>
        </p>

        <div className="auth-alt">
          <Link href="/admin" className="link-quiet">
            Admin portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
