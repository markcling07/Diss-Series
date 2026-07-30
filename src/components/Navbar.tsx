'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (e) {
      console.error('Failed to fetch user:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <header className="navbar">
      <div className="nav-content">
        <Link href="/" className="logo">
          DissPic
        </Link>

        {/* Labels only. At this size a row of icons alongside mono capitals
            reads as clutter, and the words are unambiguous on their own. */}
        <nav className="nav-links">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            Upload
          </Link>

          {user && (
            <Link
              href="/profile"
              className={`nav-link ${pathname === '/profile' ? 'active' : ''}`}
            >
              My uploads
            </Link>
          )}

          {user && (
            <Link
              href="/galleries"
              className={`nav-link ${pathname.startsWith('/galleries') ? 'active' : ''}`}
            >
              Galleries
            </Link>
          )}

          {user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
            <Link
              href="/admin/dashboard"
              className={`nav-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              Admin
            </Link>
          )}

          {!loading &&
            (user ? (
              <div className="nav-session">
                <span className="nav-user">@{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  title="Sign out"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <div className="nav-session">
                <Link href="/login" className="btn btn-secondary btn-sm">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                  Create account
                </Link>
              </div>
            ))}
        </nav>
      </div>
    </header>
  );
}
