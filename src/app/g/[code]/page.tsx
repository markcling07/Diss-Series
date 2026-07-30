'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Loader2, Share2 } from 'lucide-react';
import PhotoGrid, { PhotoItem } from '@/components/PhotoGrid';
import UploadForm from '@/components/UploadForm';

interface Gallery {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}

export default function GalleryPage() {
  const { code } = useParams<{ code: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShare, setShowShare] = useState(false);

  const fetchGallery = useCallback(async () => {
    try {
      const res = await fetch(`/api/galleries/${code}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load gallery');
      }

      setGallery(data.gallery);
      setPhotos(data.photos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [code]);

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

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="eyebrow">Gallery · {gallery.code}</span>
          <h1 className="page-title">{gallery.name}</h1>
          <p className="page-subtitle">
            {photos.length === 1 ? '1 photo' : `${photos.length} photos`} · anyone with
            this link can add to it
          </p>
        </div>
      </div>

      <UploadForm
        galleryCode={gallery.code}
        onUploaded={fetchGallery}
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowShare((open) => !open)}
            aria-expanded={showShare}
            aria-controls="share-panel"
          >
            <Share2 size={16} />
            <span>{showShare ? 'Hide share info' : 'Share'}</span>
          </button>
        }
      />

      {/* Collapsed by default: the code, link and QR are only needed when
          inviting people, so they shouldn't push the photos down the page.
          Rendered after the upload row so it expands directly below its button. */}
      {showShare && (
        <div className="panel" id="share-panel">
          <div className="share-grid">
            <div className="share-main">
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

              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy link'}</span>
              </button>
            </div>

            {shareUrl && (
              <div className="share-qr">
                <QRCodeSVG value={shareUrl} size={148} fgColor="#17161b" bgColor="#ffffff" />
                <p className="share-qr-label">Scan to join</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uploader badges are omitted here to keep the sheet to pure frames; who
          uploaded what is still shown in the lightbox. */}
      <PhotoGrid
        photos={photos}
        showUploaderInfo={false}
        emptyMessage="Nothing here yet — add the first photo above."
      />
    </div>
  );
}
