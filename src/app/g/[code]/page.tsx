'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, Check, Copy, LayoutGrid, Loader2, Share2 } from 'lucide-react';
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
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
        <p>Loading gallery...</p>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Gallery not found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            No gallery matches the code <strong>{code}</strong>. Check it for typos, or ask whoever
            shared the link to send it again.
          </p>
          <Link href="/" className="btn btn-primary">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <LayoutGrid style={{ color: 'var(--primary)' }} />
            {gallery.name}
          </h1>
          <p className="page-subtitle">
            {photos.length === 1 ? '1 photo' : `${photos.length} photos`}
            {' · '}
            anyone with this link can add to it
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
            <Share2 size={18} />
            <span>{showShare ? 'Hide share info' : 'Share'}</span>
          </button>
        }
      />

      {/* Collapsed by default: the code, link and QR are only needed when
          inviting people, so they shouldn't push the photos down the page.
          Rendered after the upload row so it expands directly below its button. */}
      {showShare && (
        <div className="glass-panel" id="share-panel">
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <label className="form-label">Gallery code</label>
              <div className="gallery-code" style={{ marginBottom: '1rem' }}>{gallery.code}</div>

              <label className="form-label" htmlFor="share-url">Share link</label>
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
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy link'}</span>
              </button>
            </div>

            {shareUrl && (
              <div style={{ textAlign: 'center' }}>
                <QRCodeSVG value={shareUrl} size={160} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Scan to join
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <PhotoGrid
        photos={photos}
        emptyMessage="No photos in this gallery yet — be the first to upload!"
      />
    </div>
  );
}
