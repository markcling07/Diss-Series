'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FolderPlus, Loader2, Trash2 } from 'lucide-react';
import PhotoGrid, { PhotoItem } from '@/components/PhotoGrid';
import DeleteGalleryDialog, { DeletableGallery } from '@/components/DeleteGalleryDialog';

interface Gallery {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  _count: { photos: number };
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeletableGallery | null>(null);

  useEffect(() => {
    fetchPageData();
  }, []);

  // Both halves of the page belong to the same account, so they load together
  // and share one signed-out state.
  const fetchPageData = async () => {
    try {
      const [galleriesRes, photosRes] = await Promise.all([
        fetch('/api/galleries'),
        fetch('/api/photos/mine'),
      ]);

      if (galleriesRes.status === 401 || photosRes.status === 401) {
        setSignedOut(true);
        return;
      }

      const galleriesData = await galleriesRes.json();
      if (!galleriesRes.ok) {
        throw new Error(galleriesData.error || 'Failed to load galleries');
      }
      setGalleries(galleriesData.galleries);

      const photosData = await photosRes.json();
      if (!photosRes.ok) {
        throw new Error(photosData.error || 'Failed to load photos');
      }
      setPhotos(photosData.photos);
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
      <div className="state">
        <Loader2 size={28} className="animate-spin" />
        <p className="state-mono" style={{ marginTop: '1rem' }}>
          Loading galleries
        </p>
      </div>
    );
  }

  if (signedOut) {
    return (
      <div className="state-narrow">
        <span className="eyebrow">Sign in required</span>
        <h1 className="state-title">Galleries need an account.</h1>
        <p className="state-text">
          You need one to create a gallery. The people you share it with won&apos;t.
        </p>
        <Link href="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* The label is the page's h1 even though it's set small — with the
          headline gone, something still has to name the page for anyone
          navigating by headings. */}
      <div className="page-header">
        <h1 className="eyebrow">Galleries</h1>
      </div>

      <div className="panel">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label" htmlFor="gallery-name">
              Gallery name
            </label>
            <input
              id="gallery-name"
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Class 5A zoo trip"
              maxLength={80}
              required
            />
          </div>

          {error && (
            <div className="alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={creating}>
            <FolderPlus size={16} />
            <span>{creating ? 'Creating…' : 'Create gallery'}</span>
          </button>
        </form>
      </div>

      {galleries.length === 0 ? (
        <div className="state-empty">
          <p className="state-mono">No galleries</p>
          <p className="state-text" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            Create one above to get a shareable link and QR code.
          </p>
        </div>
      ) : (
        <div className="panel">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Photos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {galleries.map((gallery) => (
                  <tr key={gallery.id}>
                    <td>
                      <span className="table-name">{gallery.name}</span>
                    </td>
                    <td>
                      <span className="gallery-code gallery-code-sm">{gallery.code}</span>
                    </td>
                    <td>{gallery._count.photos}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          href={`/g/${gallery.code}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Open
                        </Link>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm btn-icon"
                          onClick={() =>
                            setPendingDelete({
                              code: gallery.code,
                              name: gallery.name,
                              photoCount: gallery._count.photos,
                            })
                          }
                          aria-label={`Delete gallery ${gallery.name}`}
                          title="Delete this gallery and its photos"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Everything this account has uploaded, wherever it went. Lives here now
          that the separate uploads page is gone. */}
      <section className="page-section">
        <PhotoGrid
          photos={photos}
          showUploaderInfo={false}
          emptyMessage="You haven't uploaded anything yet. Add a photo from the homepage, or open a gallery above."
        />
      </section>

      <DeleteGalleryDialog
        gallery={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onDeleted={(deleted) => {
          setPendingDelete(null);
          setGalleries((prev) => prev.filter((g) => g.code !== deleted.code));
          // The sheet below lists this account's own uploads, which may have
          // included photos from that gallery — so it has to be refetched
          // rather than left showing photos that no longer exist.
          if (deleted.photoCount > 0) fetchPageData();
        }}
      />
    </div>
  );
}
