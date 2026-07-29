'use me';
'use client';

import React, { useState } from 'react';
import { User, Calendar, Search, Image as ImageIcon } from 'lucide-react';

export interface PhotoItem {
  id: string;
  filename: string;
  originalName: string;
  caption?: string | null;
  mimeType: string;
  size: number;
  createdAt: string;
  user?: {
    username: string;
    email: string;
  } | null;
}

interface Props {
  photos: PhotoItem[];
  emptyMessage?: string;
  showUploaderInfo?: boolean;
}

export default function PhotoGrid({
  photos,
  emptyMessage = 'No photos found',
  showUploaderInfo = true,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPhotos = photos.filter((photo) => {
    const term = searchTerm.toLowerCase();
    const captionMatch = photo.caption?.toLowerCase().includes(term);
    const filenameMatch = photo.originalName.toLowerCase().includes(term);
    const userMatch = photo.user?.username.toLowerCase().includes(term);
    return captionMatch || filenameMatch || userMatch;
  });

  // Photos arrive newest-first, so groups stay in that order.
  const groupedPhotos = Array.from(
    filteredPhotos.reduce((groups, photo) => {
      const label = new Date(photo.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const existing = groups.get(label);
      if (existing) {
        existing.push(photo);
      } else {
        groups.set(label, [photo]);
      }
      return groups;
    }, new Map<string, PhotoItem[]>())
  );

  if (photos.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <ImageIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
        <p style={{ fontSize: '1.1rem' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Search by caption or uploader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing {filteredPhotos.length} of {photos.length} photos
        </span>
      </div>

      {groupedPhotos.map(([dateLabel, groupPhotos]) => (
        <section key={dateLabel} className="photo-group">
          <h2 className="photo-group-date">
            <Calendar size={14} />
            {dateLabel}
          </h2>

          <div className="photo-grid">
            {groupPhotos.map((photo) => (
              <div key={photo.id} className="photo-card glass-panel">
                <div className="photo-img-wrapper">
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.caption || photo.originalName}
                    className="photo-img"
                    loading="lazy"
                  />
                </div>

                {showUploaderInfo && (
                  <div className="photo-body">
                    <div className="photo-meta">
                      <span className={`badge ${photo.user ? 'badge-user' : 'badge-guest'}`}>
                        <User size={12} />
                        {photo.user ? `@${photo.user.username}` : 'Anonymous'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
