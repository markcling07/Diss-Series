'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FolderPlus, LayoutGrid, Loader2, Share2 } from 'lucide-react';

interface Gallery {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  _count: { photos: number };
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const res = await fetch('/api/galleries');
      const data = await res.json();

      if (res.status === 401) {
        setSignedOut(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load galleries');
      }

      setGalleries(data.galleries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const res = await fetch('/api/galleries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create gallery');
      }

      setGalleries((prev) => [data.gallery, ...prev]);
      setName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
        <p>Loading your galleries...</p>
      </div>
    );
  }

  if (signedOut) {
    return (
      <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sign in required</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            You need an account to create a gallery. The people you share it with won&apos;t need one.
          </p>
          <Link href="/login" className="btn btn-primary">
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <LayoutGrid style={{ color: 'var(--primary)' }} />
            My Galleries
          </h1>
          <p className="page-subtitle">
            Create a gallery, then share its link or QR code so everyone can upload into it
          </p>
        </div>
      </div>

      <div className="glass-panel">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label" htmlFor="gallery-name">Gallery name</label>
            <input
              id="gallery-name"
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Class 5A Zoo Trip"
              maxLength={80}
              required
            />
          </div>

          {error && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
            <FolderPlus size={18} />
            <span>{creating ? 'Creating...' : 'Create Gallery'}</span>
          </button>
        </form>
      </div>

      {galleries.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No galleries yet. Create one above to get a shareable link and QR code.</p>
        </div>
      ) : (
        <div className="glass-panel">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Photos</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {galleries.map((gallery) => (
                  <tr key={gallery.id}>
                    <td>{gallery.name}</td>
                    <td>
                      <span className="gallery-code" style={{ fontSize: '1rem' }}>{gallery.code}</span>
                    </td>
                    <td>{gallery._count.photos}</td>
                    <td>
                      <Link href={`/g/${gallery.code}`} className="btn btn-secondary btn-sm">
                        <Share2 size={14} />
                        <span>Open</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
