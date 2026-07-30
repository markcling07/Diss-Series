'use client';

import React, { useEffect, useState } from 'react';
import PhotoGrid, { PhotoItem } from '@/components/PhotoGrid';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyPhotos();
  }, []);

  const fetchMyPhotos = async () => {
    try {
      const res = await fetch('/api/photos/mine');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load photos');
      }

      setPhotos(data.photos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="state">
        <Loader2 size={28} className="animate-spin" />
        <p className="state-mono" style={{ marginTop: '1rem' }}>
          Loading your uploads
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-narrow">
        <span className="eyebrow">Sign in required</span>
        <h1 className="state-title">This list is yours alone.</h1>
        <p className="state-text">Sign in to see everything you&apos;ve uploaded.</p>
        <Link href="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">My uploads</span>
          <h1 className="page-title">Everything you&rsquo;ve added.</h1>
          <p className="page-subtitle">
            {photos.length === 1 ? '1 photo' : `${photos.length} photos`}, newest first.
          </p>
        </div>

        <Link href="/" className="btn btn-primary">
          Upload more
        </Link>
      </div>

      <PhotoGrid
        photos={photos}
        showUploaderInfo={false}
        emptyMessage="You haven't uploaded anything yet. Head to the homepage to add your first photo."
      />
    </div>
  );
}
