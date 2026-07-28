'use me';
'use client';

import React, { useEffect, useState } from 'react';
import PhotoGrid, { PhotoItem } from '@/components/PhotoGrid';
import { Shield, Users, Loader2, AlertCircle, Eye } from 'lucide-react';
import Link from 'next/link';

interface UserMeta {
  id: string;
  username: string;
  email: string;
  role: string;
}

export default function AdminDashboardPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const photosRes = await fetch('/api/photos');
      const photosData = await photosRes.json();

      if (!photosRes.ok) {
        throw new Error(photosData.error || 'Failed to fetch photos');
      }

      setPhotos(photosData.photos);
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
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {error}
          </p>
          <Link href="/admin" className="btn btn-primary">
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  const registeredUploads = photos.filter((p) => p.user).length;
  const guestUploads = photos.length - registeredUploads;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Shield style={{ color: '#a855f7' }} />
              Admin Photo Dashboard
            </h1>
            {currentUser && (
              <span className={`badge ${currentUser.role === 'SUPER_ADMIN' ? 'badge-superadmin' : 'badge-admin'}`}>
                {currentUser.role}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Viewing all uploaded pictures submitted across the platform (View-Only Mode)
          </p>
        </div>

        {currentUser?.role === 'SUPER_ADMIN' && (
          <Link href="/admin/dashboard/manage" className="btn btn-secondary" style={{ borderColor: 'rgba(168, 85, 247, 0.4)' }}>
            <Users size={18} style={{ color: '#d8b4fe' }} />
            <span>Manage Admins</span>
          </Link>
        )}
      </div>

      {/* Stats summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Photos Uploaded</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>{photos.length}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered User Uploads</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a5b4fc', marginTop: '0.25rem' }}>{registeredUploads}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Guest Uploads</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#cbd5e1', marginTop: '0.25rem' }}>{guestUploads}</div>
        </div>
      </div>

      <PhotoGrid
        photos={photos}
        showUploaderInfo={true}
        emptyMessage="No photos have been uploaded to the database yet."
      />
    </div>
  );
}
