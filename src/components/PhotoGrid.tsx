'use me';
'use client';

import React, { useState, useEffect } from 'react';
import { User, Calendar, Image as ImageIcon, X } from 'lucide-react';

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
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  // Close the lightbox on Escape, matching the click-outside behaviour.
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPhoto(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto]);

  // Photos arrive newest-first, so groups stay in that order.
  const groupedPhotos = Array.from(
    photos.reduce((groups, photo) => {
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
      {groupedPhotos.map(([dateLabel, groupPhotos]) => (
        <section key={dateLabel} className="photo-group">
          <h2 className="photo-group-date">
            <Calendar size={14} />
            {dateLabel}
          </h2>

          <div className="photo-grid">
            {groupPhotos.map((photo) => (
              <div key={photo.id} className="photo-card glass-panel">
                <div
                  className="photo-img-wrapper"
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${photo.caption || photo.originalName}`}
                  onClick={() => setSelectedPhoto(photo)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPhoto(photo);
                    }
                  }}
                >
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

      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close photo"
            >
              <X size={20} />
            </button>

            <img
              src={`/uploads/${selectedPhoto.filename}`}
              alt={selectedPhoto.caption || selectedPhoto.originalName}
              className="lightbox-img"
            />

            <div className="lightbox-info">
              {selectedPhoto.caption ? (
                <p className="lightbox-caption">{selectedPhoto.caption}</p>
              ) : (
                <p className="lightbox-caption lightbox-caption-empty">No caption</p>
              )}

              <div className="lightbox-meta">
                <span>
                  <Calendar size={13} />
                  {new Date(selectedPhoto.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                {showUploaderInfo && (
                  <span>
                    <User size={13} />
                    {selectedPhoto.user ? `@${selectedPhoto.user.username}` : 'Anonymous'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
