'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Check, CheckSquare, Copy, Loader2, Lock, LockOpen, QrCode, Trash2, X } from 'lucide-react';
import PhotoGrid, { PhotoItem } from '@/components/PhotoGrid';
import UploadForm from '@/components/UploadForm';
import DeleteGalleryDialog, { DeletableGallery } from '@/components/DeleteGalleryDialog';

interface Gallery {
  id: string;
  code: string;
  name: string;
  isOpen: boolean;
  createdAt: string;
}

export default function GalleryPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingGalleryDelete, setPendingGalleryDelete] = useState<DeletableGallery | null>(null);

  const fetchGallery = useCallback(async () => {
    try {
      const res = await fetch(`/api/galleries/${code}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load gallery');
      }

      setGallery(data.gallery);
      setPhotos(data.photos);
      setIsOwner(data.isOwner);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  const handleToggleOpen = async () => {
    if (!gallery) return;
    setToggling(true);

    try {
      const res = await fetch(`/api/galleries/${gallery.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: !gallery.isOpen }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update gallery');
      }

      setGallery((g) => (g ? { ...g, isOpen: data.gallery.isOpen } : g));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
    setConfirmOpen(false);
    setDeleteError(null);
  };

  const toggleSelected = (photo: PhotoItem) => {
    setSelectedIds((prev) =>
      prev.includes(photo.id) ? prev.filter((id) => id !== photo.id) : [...prev, photo.id]
    );
  };

  const allSelected = photos.length > 0 && selectedIds.length === photos.length;

  // Deleted one at a time against the existing per-photo endpoint. A gallery
  // holds tens of photos, not thousands, and this keeps the server side to the
  // single tested route — the same reasoning behind UploadForm's upload loop.
  //
  // Failures are collected rather than thrown, because a batch that dies
  // halfway must still report what it did manage to remove.
  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);

    const deleted: string[] = [];
    const failures: string[] = [];

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      setDeleteProgress(`Deleting ${i + 1} of ${selectedIds.length}…`);

      try {
        const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete photo');
        }

        deleted.push(id);
      } catch (err: any) {
        failures.push(err.message || 'Failed to delete photo');
      }
    }

    // Dropped locally rather than refetching: the sheet is already correct once
    // these frames are gone, and a refetch would flash the whole grid.
    setPhotos((prev) => prev.filter((photo) => !deleted.includes(photo.id)));
    setDeleting(false);
    setDeleteProgress('');

    if (failures.length > 0) {
      // Whatever survived stays ticked, so a retry doesn't start from scratch.
      setSelectedIds((prev) => prev.filter((id) => !deleted.includes(id)));
      setDeleteError(
        `${failures.length} of ${selectedIds.length} couldn't be deleted: ${failures[0]}`
      );
      return;
    }

    exitSelectMode();
  };

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // Built on the client because only the browser knows the address people
  // actually reached this page on — a LAN IP, not whatever the server thinks.
  useEffect(() => {
    if (gallery) {
      setShareUrl(`${window.location.origin}/g/${gallery.code}`);
    }
  }, [gallery]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // navigator.clipboard is undefined over plain http on a LAN IP, which is
      // exactly how this gets used. The URL field below stays selectable.
    }
  };

  if (loading) {
    return (
      <div className="state">
        <Loader2 size={28} className="animate-spin" />
        <p className="state-mono" style={{ marginTop: '1rem' }}>
          Loading gallery
        </p>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="state-narrow">
        <span className="eyebrow">Not found</span>
        <h1 className="state-title">No gallery with that code.</h1>
        <p className="state-text">
          Nothing matches <span className="gallery-code gallery-code-sm">{code}</span>.
          Check it for typos, or ask whoever shared the link to send it again.
        </p>
        <Link href="/" className="btn btn-primary">
          Go to the homepage
        </Link>
      </div>
    );
  }

  // Icon only — the QR code is the thing people recognise here, and the row it
  // sits in is already carrying two worded buttons. The label lives in the
  // tooltip and the accessible name.
  const shareButton = (
    <button
      type="button"
      className="btn btn-secondary btn-icon"
      onClick={() => setShowShare(true)}
      aria-haspopup="dialog"
      aria-label="Share this gallery"
      title="Share this gallery"
    >
      <QrCode size={16} />
    </button>
  );

  // One entry point for deletion, rather than a control sitting on every frame.
  // Owner-only. No !selectMode guard needed: the row holding this is unmounted
  // while selecting.
  const selectButton =
    isOwner && photos.length > 0 ? (
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setSelectMode(true)}
        title="Pick photos to remove from this gallery"
      >
        <CheckSquare size={16} />
        <span>Select photos</span>
      </button>
    ) : null;

  // Only the owner sees this. Everyone else just sees the result: an upload
  // form, or no upload form.
  //
  // Icon only, like the share control beside it. The padlock carries the whole
  // meaning, but it is doing double duty — it shows the current state and the
  // action at once — so the tooltip and accessible name spell out what a click
  // will do rather than what the gallery currently is.
  const ownerToggle = isOwner ? (
    <button
      type="button"
      className="btn btn-secondary btn-icon"
      onClick={handleToggleOpen}
      disabled={toggling}
      aria-label={
        gallery.isOpen
          ? 'Close gallery — stop accepting photos'
          : 'Reopen gallery — accept photos again'
      }
      title={
        gallery.isOpen
          ? 'Stop accepting photos — the link becomes view-only'
          : 'Accept photos again from anyone with the link'
      }
    >
      {toggling ? (
        <Loader2 size={16} className="animate-spin" />
      ) : gallery.isOpen ? (
        <Lock size={16} />
      ) : (
        <LockOpen size={16} />
      )}
    </button>
  ) : null;

  // Unreachable while selecting photos, since the row it lives in is unmounted
  // then — so the two kinds of deletion, some frames versus the whole gallery,
  // are never one misclick apart.
  const deleteGalleryButton =
    isOwner ? (
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        onClick={() =>
          setPendingGalleryDelete({
            code: gallery.code,
            name: gallery.name,
            photoCount: photos.length,
          })
        }
        aria-label="Delete this gallery"
        title="Delete this gallery and its photos"
      >
        <Trash2 size={16} />
      </button>
    ) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Gallery · {gallery.code}</span>
          <h1 className="page-title">{gallery.name}</h1>
          <p className="page-subtitle">
            {photos.length === 1 ? '1 photo' : `${photos.length} photos`} ·{' '}
            {gallery.isOpen
              ? 'anyone with this link can add to it'
              : 'closed — view only'}
          </p>
        </div>
      </div>

      {/* Selecting takes the whole row over rather than sitting beside the
          upload form. Left alongside it, choosing files swaps this row for the
          upload tray while the checkboxes stay on the grid below — two modes
          running at once, and the tray doesn't carry the action buttons, so the
          way out disappears too. The selection bar below is the only control
          while selecting, and Cancel brings this row back.

          The share button and the owner's open/close control belong together on
          one row. When the gallery is closed there is no upload form to hang
          them off, so they get their own row instead. */}
      {selectMode ? null : gallery.isOpen ? (
        <UploadForm
          galleryCode={gallery.code}
          onUploaded={fetchGallery}
          actions={<>{shareButton}{ownerToggle}{deleteGalleryButton}{selectButton}</>}
        />
      ) : (
        <div className="upload-bar">
          {shareButton}
          {ownerToggle}
          {deleteGalleryButton}
          {selectButton}
        </div>
      )}

      {/* A popup rather than an inline panel: inviting people is a moment, not a
          state of the page, and the QR wants to be the biggest thing on screen
          while someone is pointing a phone at it. */}
      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowShare(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <span className="eyebrow">Invite</span>

            <h3 className="modal-title" id="share-title">
              {gallery.isOpen ? 'Anyone with this can add photos.' : 'Share the finished set.'}
            </h3>

            {shareUrl && (
              <div className="share-qr share-qr-modal">
                <QRCodeSVG value={shareUrl} size={168} fgColor="#17161b" bgColor="#ffffff" />
                <p className="share-qr-label">Scan to join</p>
              </div>
            )}

            <label className="form-label">Gallery code</label>
            <div className="gallery-code" style={{ marginBottom: '1.5rem' }}>
              {gallery.code}
            </div>

            <label className="form-label" htmlFor="share-url">
              Share link
            </label>
            <input
              id="share-url"
              className="form-input"
              type="text"
              value={shareUrl}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              style={{ marginBottom: '0.75rem' }}
            />

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={handleCopy}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Uploader badges are omitted here to keep the sheet to pure frames; who
          uploaded what is still shown in the lightbox. */}
      {selectMode && (
        <div className="select-bar">
          <span className="state-mono">
            {selectedIds.length === 0
              ? 'Tap photos to select'
              : `${selectedIds.length} selected`}
          </span>

          <div className="select-bar-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                setSelectedIds(allSelected ? [] : photos.map((photo) => photo.id))
              }
            >
              {allSelected ? 'Clear' : 'Select all'}
            </button>

            <button type="button" className="btn btn-secondary btn-sm" onClick={exitSelectMode}>
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setConfirmOpen(true)}
              disabled={selectedIds.length === 0}
            >
              <Trash2 size={13} />
              <span>
                Delete {selectedIds.length > 0 ? selectedIds.length : ''}
                {selectedIds.length === 1 ? ' photo' : ' photos'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Only the owner gets to select. The endpoint also lets a signed-in
          uploader remove their own photo, but this page has no idea who the
          viewer is beyond isOwner, so it doesn't offer what it can't confirm. */}
      <PhotoGrid
        photos={photos}
        showUploaderInfo={false}
        emptyMessage="Nothing here yet — add the first photo above."
        groupByUploader
        selectable={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelected}
      />

      {/* The gallery this page is showing has just stopped existing, so there
          is nothing to return to — off to the list instead. */}
      <DeleteGalleryDialog
        gallery={pendingGalleryDelete}
        onCancel={() => setPendingGalleryDelete(null)}
        onDeleted={() => router.push('/galleries')}
      />

      {confirmOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!deleting) {
              setConfirmOpen(false);
              setDeleteError(null);
            }
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <span className="eyebrow">Permanent</span>

            <h3 className="modal-title">
              Delete {selectedIds.length === 1 ? 'this photo' : `these ${selectedIds.length} photos`}?
            </h3>

            <p className="modal-text">
              {selectedIds.length === 1 ? 'It' : 'They'} will be removed from{' '}
              {gallery.name}. The {selectedIds.length === 1 ? 'file is' : 'files are'} deleted
              from the server too, and whoever added {selectedIds.length === 1 ? 'it' : 'them'}{' '}
              can&apos;t put {selectedIds.length === 1 ? 'it' : 'them'} back.
            </p>

            {deleteError && (
              <div className="alert-error">
                <span>{deleteError}</span>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>
                  {deleting
                    ? deleteProgress || 'Deleting…'
                    : `Delete ${selectedIds.length} ${selectedIds.length === 1 ? 'photo' : 'photos'}`}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => {
                  setConfirmOpen(false);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                {deleteError ? 'Back to selection' : 'Keep them'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
