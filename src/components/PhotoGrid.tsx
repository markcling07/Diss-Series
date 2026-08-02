'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, User, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// Uploads are not static assets — they are streamed by a route handler that
// pins the content type. Stored names may contain a `thumbs/` segment, so each
// segment is encoded separately to keep the slash meaningful as a path
// separator rather than escaping it.
function photoUrl(storedName: string): string {
  return `/api/files/${storedName.split('/').map(encodeURIComponent).join('/')}`;
}

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
  // Decided by the server: whether this viewer may remove this photo. Absent on
  // responses that never offer deletion, which is why selection treats only an
  // explicit `true` as permission.
  canDelete?: boolean;
}

interface Props {
  photos: PhotoItem[];
  emptyMessage?: string;
  // Governs the badge under each frame only. The lightbox always names the
  // uploader — that is the view you open to learn about a single photo.
  showUploaderInfo?: boolean;
  // Turns the sheet into a picker: every frame gets a checkbox and clicking one
  // ticks it rather than opening it. The grid only reports what was ticked —
  // deciding who may select, and what happens to the selection, belongs to the
  // page, which is the one that knows whether this viewer owns the gallery.
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (photo: PhotoItem) => void;
  // Blocks each day's frames by who added them, under a small header naming the
  // uploader. Off by default — it only earns its space where photos genuinely
  // come from several people.
  groupByUploader?: boolean;
}

type Entry = { photo: PhotoItem; index: number };

// Frame numbers are padded so the column of labels stays the same width as a
// sheet fills up — the same reason a contact sheet prints 04 rather than 4.
const frameLabel = (index: number) => String(index + 1).padStart(2, '0');

export default function PhotoGrid({
  photos,
  emptyMessage = 'No photos yet',
  showUploaderInfo = true,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  groupByUploader = false,
}: Props) {
  // Tracked by index so the lightbox can step through `photos` in order. Not to
  // be confused with `selectedIds` above — that is the delete selection, which
  // is a different thing entirely and lives on the page.
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

  // A lightbox left open would hang over the picker, so entering selection
  // mode closes it.
  useEffect(() => {
    if (selectable) setSelectedIndex(null);
  }, [selectable]);

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
    }, new Map<string, Entry[]>())
  );

  // Within a sheet, block the frames by who added them, in the order each
  // uploader first appears. Guests all collapse into one block: there is no
  // identity to tell them apart by, and a block per anonymous upload would be
  // noise rather than structure.
  const byUploader = (entries: Entry[]) => {
    const groups = new Map<string, { key: string; username: string | null; entries: Entry[] }>();

    for (const entry of entries) {
      const username = entry.photo.user?.username ?? null;
      // Prefixed so a member called "guest" can't collide with the guest block.
      const key = username ? `user:${username}` : 'guest';
      const existing = groups.get(key);

      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.set(key, { key, username, entries: [entry] });
      }
    }

    return Array.from(groups.values());
  };

  const renderCard = ({ photo, index }: Entry) => {
    // Selection is per-frame, not per-sheet: a contributor picking their own
    // photos out of a shared gallery sees checkboxes only on theirs. Everyone
    // else's frames stay ordinary and still open in the lightbox, so the sheet
    // reads the same either way.
    const isPickable = selectable && photo.canDelete === true;
    const isTicked = isPickable && selectedIds.includes(photo.id);
    const label = photo.caption || photo.originalName;

    // One handler for both modes: while selecting, a tickable frame ticks
    // instead of opening, so there is never a click that does both.
    const activate = () => {
      if (isPickable) {
        onToggleSelect?.(photo);
      } else {
        setSelectedIndex(index);
      }
    };

    return (
      <div key={photo.id} className={`photo-card ${isTicked ? 'photo-card-selected' : ''}`}>
        <div
          className="photo-img-wrapper"
          role={isPickable ? 'checkbox' : 'button'}
          aria-checked={isPickable ? isTicked : undefined}
          tabIndex={0}
          aria-label={isPickable ? `Select ${label}` : `View ${label}`}
          onClick={activate}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              activate();
            }
          }}
        >
          <img
            src={photoUrl(photo.thumbFilename || photo.filename)}
            alt={label}
            className="photo-img"
            loading="lazy"
          />
          <span className="frame-index" aria-hidden="true">
            {frameLabel(index)}
          </span>

          {/* Always visible while selecting — an empty box is what tells you
              the frame is tickable at all, and its absence is what tells you
              someone else's frame is not yours to remove. */}
          {isPickable && (
            <span
              className={`photo-select ${isTicked ? 'photo-select-on' : ''}`}
              aria-hidden="true"
            >
              {isTicked && <Check size={13} strokeWidth={3} />}
            </span>
          )}
        </div>

        {showUploaderInfo && (
          <div className="photo-body">
            <div className="photo-meta">
              <span className={`badge ${photo.user ? 'badge-user' : 'badge-guest'}`}>
                {photo.user ? `@${photo.user.username}` : 'Guest'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

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

          {groupByUploader ? (
            byUploader(entries).map((group) => (
              <div key={group.key} className="uploader-block">
                <div className="uploader-head">
                  {/* No profile photos exist yet, so this is a monogram of the
                      username — the same stand-in the navbar uses, and the same
                      place a real avatar goes once they do. Guests get the
                      generic figure: there is no name to take a letter from. */}
                  <span className="uploader-avatar" aria-hidden="true">
                    {group.username ? (
                      group.username.charAt(0).toUpperCase()
                    ) : (
                      <User size={13} />
                    )}
                  </span>

                  <span className="uploader-name">
                    {group.username ? `@${group.username}` : 'Guest'}
                  </span>
                </div>

                <div className="photo-grid">{group.entries.map(renderCard)}</div>
              </div>
            ))
          ) : (
            <div className="photo-grid">{entries.map(renderCard)}</div>
          )}
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
                src={photoUrl(selectedPhoto.filename)}
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

                {/* Always shown, unlike the badge on the card. Suppressing the
                    badges keeps the sheet to pure frames; the lightbox is where
                    you go to find out about one photo, so hiding who took it
                    there would defeat the point. */}
                <span>
                  <User size={12} />
                  {selectedPhoto.user ? `@${selectedPhoto.user.username}` : 'Guest'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
