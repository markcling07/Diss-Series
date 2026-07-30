'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
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

      if (data.user.role !== 'ADMIN' && data.user.role !== 'SUPER_ADMIN') {
        throw new Error('That account doesn’t have administrator access.');
      }

      router.push('/admin/dashboard');
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
          <span className="eyebrow">Admin portal</span>
          <h1 className="auth-title">Administrator sign in.</h1>
          <p className="auth-sub">Staff accounts only.</p>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-id">
              Username or email
            </label>
            <div className="field">
              <User size={16} className="field-icon" />
              <input
                id="admin-id"
                type="text"
                required
                className="form-input"
                placeholder="admin@app.com"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">
              Password
            </label>
            <div className="field">
              <Lock size={16} className="field-icon" />
              <input
                id="admin-password"
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
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>

        {/* Seeded first-run credentials. These are printed for setup and should
            come out before this is exposed to anyone outside the classroom. */}
        <div className="notice" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            First-run accounts — change these before going live.
            <br />
            <code>superadmin@app.com / admin123</code>
            <br />
            <code>admin@app.com / admin123</code>
          </span>
        </div>
      </div>
    </div>
  );
}
