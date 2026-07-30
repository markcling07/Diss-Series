'use me';
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Camera, User, LogOut, Shield, History, Upload, LayoutGrid } from 'lucide-react';

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
          <Camera size={26} />
          <span>DissPic</span>
        </Link>

        <nav className="nav-links">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            <Upload size={18} />
            <span>Upload</span>
          </Link>

          {user && (
            <Link href="/profile" className={`nav-link ${pathname === '/profile' ? 'active' : ''}`}>
              <History size={18} />
              <span>My Uploads</span>
            </Link>
          )}

          {user && (
            <Link href="/galleries" className={`nav-link ${pathname.startsWith('/galleries') ? 'active' : ''}`}>
              <LayoutGrid size={18} />
              <span>My Galleries</span>
            </Link>
          )}

          {user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
            <Link
              href="/admin/dashboard"
              className={`nav-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              <Shield size={18} />
              <span>Admin Dashboard</span>
            </Link>
          )}

          {!loading && (
            user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '0.5rem' }}>
                <span className="badge badge-user" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem' }}>
                  <User size={14} />
                  {user.username}
                </span>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Logout">
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                <Link href="/login" className="btn btn-secondary btn-sm">
                  Sign In
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                  Create Account
                </Link>
              </div>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
