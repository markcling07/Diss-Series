'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'We couldn’t create that account.');
      }

      router.push('/profile');
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
          <span className="eyebrow">Create account</span>
          <h1 className="auth-title">Keep your photos together.</h1>
          <p className="auth-sub">
            An account lists everything you upload, from any device.
          </p>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-username">
              Username
            </label>
            <div className="field">
              <User size={16} className="field-icon" />
              <input
                id="register-username"
                type="text"
                required
                className="form-input"
                placeholder="janedoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              Email
            </label>
            <div className="field">
              <Mail size={16} className="field-icon" />
              <input
                id="register-email"
                type="email"
                required
                className="form-input"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Password
            </label>
            <div className="field">
              <Lock size={16} className="field-icon" />
              <input
                id="register-password"
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-foot">
          Already have one?{' '}
          <Link href="/login" className="link-accent">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
