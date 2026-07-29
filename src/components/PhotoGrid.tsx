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

      <div className="photo-grid">
        {filteredPhotos.map((photo) => {
          const uploaderName = photo.user ? `@${photo.user.username}` : 'Anonymous';
          const formattedDate = new Date(photo.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={photo.id} className="photo-card glass-panel">
              <div className="photo-img-wrapper">
                <img
                  src={`/uploads/${photo.filename}`}
                  alt={photo.caption || photo.originalName}
                  className="photo-img"
                  loading="lazy"
                />
              </div>

              <div className="photo-body">
                {photo.caption ? (
                  <p className="photo-caption">{photo.caption}</p>
                ) : (
                  <p className="photo-caption" style={{ color: 'var(--text-dark)', fontStyle: 'italic' }}>
                    No caption
                  </p>
                )}

                <div className="photo-meta">
                  {showUploaderInfo && (
                    <span className={`badge ${photo.user ? 'badge-user' : 'badge-guest'}`}>
                      <User size={12} />
                      {uploaderName}
                    </span>
                  )}

                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                    <Calendar size={12} />
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
