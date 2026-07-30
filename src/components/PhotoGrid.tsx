'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, User, X, ChevronLeft, ChevronRight } from 'lucide-react';

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

// Frame numbers are padded so the column of labels stays the same width as a
// sheet fills up — the same reason a contact sheet prints 04 rather than 4.
const frameLabel = (index: number) => String(index + 1).padStart(2, '0');

export default function PhotoGrid({
  photos,
  emptyMessage = 'No photos yet',
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

  // One sheet per day. Photos arrive newest-first, so sheets stay in that
  // order. The position in `photos` is carried along so a frame can open the
  // lightbox at the right place without searching the array again.
  const sheets = Array.from(
    photos.reduce((groups, photo, index) => {
      const label = new Date(photo.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const entry = { photo, index };
      const existing = groups.get(label);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(label, [entry]);
      }
      return groups;
    }, new Map<string, { photo: PhotoItem; index: number }[]>())
  );

  if (photos.length === 0) {
    return (
      <div className="state-empty">
        <p className="state-mono">Empty sheet</p>
        <p className="state-text" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div>
      {sheets.map(([dateLabel, entries]) => (
        <section key={dateLabel} className="sheet">
          <div className="sheet-head">
            <h2 className="sheet-date">{dateLabel}</h2>
            <span className="sheet-count">
              {entries.length === 1 ? '1 frame' : `${entries.length} frames`}
            </span>
          </div>

          <div className="photo-grid">
            {entries.map(({ photo, index }) => (
              <div key={photo.id} className="photo-card">
                <div
                  className="photo-img-wrapper"
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${photo.caption || photo.originalName}`}
                  onClick={() => setSelectedIndex(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIndex(index);
                    }
                  }}
                >
                  <img
                    src={`/uploads/${photo.thumbFilename || photo.filename}`}
                    alt={photo.caption || photo.originalName}
                    className="photo-img"
                    loading="lazy"
                  />
                  <span className="frame-index" aria-hidden="true">
                    {frameLabel(index)}
                  </span>
                </div>

                {showUploaderInfo && (
                  <div className="photo-body">
                    <div className="photo-meta">
                      <span
                        className={`badge ${photo.user ? 'badge-user' : 'badge-guest'}`}
                      >
                        {photo.user ? `@${photo.user.username}` : 'Guest'}
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
              <X size={18} />
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
                  <ChevronLeft size={22} />
                </button>
              )}

              {hasNext && (
                <button
                  className="lightbox-nav lightbox-nav-next"
                  onClick={goNext}
                  aria-label="Next photo"
                >
                  <ChevronRight size={22} />
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
                  <Calendar size={12} />
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
                    <User size={12} />
                    {selectedPhoto.user ? `@${selectedPhoto.user.username}` : 'Guest'}
                  </span>
                )}

                <span className="lightbox-counter">
                  Frame {frameLabel(selectedIndex ?? 0)} / {frameLabel(photos.length - 1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
