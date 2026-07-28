'use me';
'use client';

import React, { useEffect, useState } from 'react';
import PhotoGrid, { PhotoItem } from '@/components/PhotoGrid';
import { History, Loader2, Upload, AlertCircle } from 'lucide-react';
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
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
        <p>Loading your photo history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Please sign in to your account to view your upload history gallery.
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History style={{ color: 'var(--primary)' }} />
            My Upload History
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            All photos uploaded under your account ({photos.length} total)
          </p>
        </div>

        <Link href="/" className="btn btn-primary">
          Upload New Photo
        </Link>
      </div>

      <PhotoGrid
        photos={photos}
        showUploaderInfo={false}
        emptyMessage="You haven't uploaded any photos yet! Head back to the homepage to share your first picture."
      />
    </div>
  );
}
