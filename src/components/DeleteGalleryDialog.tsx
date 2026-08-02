'use client';

import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

export interface DeletableGallery {
  code: string;
  name: string;
  photoCount: number;
}

interface Props {
  // Null closes the dialog. The gallery to delete is passed in whole so the
  // copy can name it and say how much goes with it.
  gallery: DeletableGallery | null;
  onCancel: () => void;
  onDeleted: (gallery: DeletableGallery) => void;
}

// Shared because both entry points — the /galleries row and the gallery page
// itself — must warn about exactly the same thing. Two copies of this wording
// would drift, and the wording is the only protection the photos have.
export default function DeleteGalleryDialog({ gallery, onCancel, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!gallery) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/galleries/${gallery.code}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete gallery');
      }

      onDeleted(gallery);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const close = () => {
    if (deleting) return; // never yank the dialog out from under a request
    setError(null);
    onCancel();
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-gallery-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="eyebrow">Permanent</span>

        <h3 className="modal-title" id="delete-gallery-title">
          Delete “{gallery.name}”?
        </h3>

        <p className="modal-text">
          {gallery.photoCount === 0
            ? 'This gallery is empty, so nothing else goes with it.'
            : `Its ${gallery.photoCount} ${
                gallery.photoCount === 1 ? 'photo is' : 'photos are'
              } deleted too — files and all. Anyone holding the link or code loses ${
                gallery.photoCount === 1 ? 'it' : 'them'
              }, and nobody can put ${gallery.photoCount === 1 ? 'it' : 'them'} back.`}
        </p>

        {error && (
          <div className="alert-error">
            <span>{error}</span>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            <span>{deleting ? 'Deleting…' : 'Delete gallery'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={close}
            disabled={deleting}
          >
            Keep it
          </button>
        </div>
      </div>
    </div>
  );
}
