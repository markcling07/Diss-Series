'use client';

import React, { useEffect, useState } from 'react';
import PhotoGrid, { PhotoItem } from '@/components/PhotoGrid';
import { Users, Loader2 } from 'lucide-react';
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
      <div className="state">
        <Loader2 size={28} className="animate-spin" />
        <p className="state-mono" style={{ marginTop: '1rem' }}>
          Loading dashboard
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-narrow">
        <span className="eyebrow">Access denied</span>
        <h1 className="state-title">You can&rsquo;t open this page.</h1>
        <p className="state-text">{error}</p>
        <Link href="/admin" className="btn btn-primary">
          Go to admin sign in
        </Link>
      </div>
    );
  }

  const registeredUploads = photos.filter((p) => p.user).length;
  const guestUploads = photos.length - registeredUploads;

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">
            Admin{currentUser ? ` · ${currentUser.role.replace('_', ' ').toLowerCase()}` : ''}
          </span>
          <h1 className="page-title">Every photo on the platform.</h1>
          <p className="page-subtitle">
            Read-only view of everything uploaded, newest first.
          </p>
        </div>

        {currentUser?.role === 'SUPER_ADMIN' && (
          <Link href="/admin/dashboard/manage" className="btn btn-secondary">
            <Users size={16} />
            <span>Manage admins</span>
          </Link>
        )}
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Total photos</span>
          <div className="stat-value">{photos.length}</div>
        </div>

        <div className="stat">
          <span className="stat-label">From accounts</span>
          <div className="stat-value stat-value-accent">{registeredUploads}</div>
        </div>

        <div className="stat">
          <span className="stat-label">From guests</span>
          <div className="stat-value">{guestUploads}</div>
        </div>
      </div>

      <PhotoGrid
        photos={photos}
        showUploaderInfo={true}
        emptyMessage="Nobody has uploaded a photo yet."
      />
    </div>
  );
}
