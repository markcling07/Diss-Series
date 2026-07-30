'use me';
'use client';

import React, { useState, useEffect } from 'react';
import { User, Calendar, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface PhotoItem {
  id: string;
  filename: string;
  // Small WebP copy for the grid. Null for photos uploaded before thumbnails
  // existed, in which case the grid falls back to the full-size original.
  thumbFilename?: string | null;
  originalName: string;
  caption?: string | null;
  mimeType: string;
  size: number;
  createdAt: string;
  user?: {
    username: string;
    // Optional: public gallery responses deliberately omit email.
    email?: string;
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
  // Tracked by index so the lightbox can step through `photos` in order.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex];
  const hasPrev = selectedIndex !== null && selectedIndex > 0;
  const hasNext = selectedIndex !== null && selectedIndex < photos.length - 1;

  const goPrev = () => setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  const goNext = () =>
    setSelectedIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));

  // Escape closes; arrow keys step between photos.
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, photos.length]);

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
                  onClick={() => setSelectedIndex(photos.indexOf(photo))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIndex(photos.indexOf(photo));
                    }
                  }}
                >
                  <img
                    src={`/uploads/${photo.thumbFilename || photo.filename}`}
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
        <div className="modal-overlay" onClick={() => setSelectedIndex(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setSelectedIndex(null)}
              aria-label="Close photo"
            >
              <X size={20} />
            </button>

            <div className="lightbox-stage">
              <img
                src={`/uploads/${selectedPhoto.filename}`}
                alt={selectedPhoto.caption || selectedPhoto.originalName}
                className="lightbox-img"
              />

              {hasPrev && (
                <button
                  className="lightbox-nav lightbox-nav-prev"
                  onClick={goPrev}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {hasNext && (
                <button
                  className="lightbox-nav lightbox-nav-next"
                  onClick={goNext}
                  aria-label="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

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

                <span className="lightbox-counter">
                  {(selectedIndex ?? 0) + 1} of {photos.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
