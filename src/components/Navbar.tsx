'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ImagePlus, LogOut } from 'lucide-react';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

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

  // Close on a click anywhere else, or on Escape. Both listeners only exist
  // while the menu is open.
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointer = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  // The menu shouldn't survive a page change.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
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
              <div className="nav-account" ref={accountRef}>
                {/* No avatar image exists yet, so the icon is a monogram of the
                    first letter of the username. Once profile photos are real
                    this is where the image goes. */}
                <button
                  type="button"
                  className="nav-avatar"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Account menu for @${user.username}`}
                >
                  {user.username.charAt(0).toUpperCase()}
                </button>

                {menuOpen && (
                  <div className="nav-menu" role="menu">
                    <div className="nav-menu-head">
                      <span className="nav-menu-name">@{user.username}</span>
                      <span className="nav-menu-email">{user.email}</span>
                    </div>

                    {/* Placeholder — nothing is wired up behind this yet, so it
                        says so rather than pretending to work. */}
                    <button
                      type="button"
                      className="nav-menu-item"
                      role="menuitem"
                      disabled
                    >
                      <ImagePlus size={14} />
                      <span>Upload profile photo</span>
                      <span className="nav-menu-soon">Soon</span>
                    </button>

                    <div className="nav-menu-sep" />

                    <button
                      type="button"
                      className="nav-menu-item nav-menu-item-exit"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
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
