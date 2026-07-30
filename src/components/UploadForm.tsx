'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, X, Upload, Plus } from 'lucide-react';
import PostUploadModal from './PostUploadModal';

interface PreviewItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

interface Props {
  // When set, uploads are scoped to this gallery instead of the general pool.
  galleryCode?: string;
  onUploaded?: () => void;
  // Rendered on the same row as the select-photos button, so callers can put
  // their own controls (e.g. Share) beside it instead of elsewhere on the page.
  actions?: React.ReactNode;
}

export default function UploadForm({ galleryCode, onUploaded, actions }: Props = {}) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [generalCaption, setGeneralCaption] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (selectedFiles: FileList | File[]) => {
    setError(null);
    setSuccessMsg(null);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const newItems: PreviewItem[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach((selectedFile) => {
      if (!validTypes.includes(selectedFile.type)) {
        errors.push(`"${selectedFile.name}" isn't an image we can read.`);
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        errors.push(`"${selectedFile.name}" is over the 10MB limit.`);
        return;
      }

      newItems.push({
        id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        file: selectedFile,
        previewUrl: URL.createObjectURL(selectedFile),
        caption: '',
      });
    });

    if (errors.length > 0) {
      setError(errors.join(' '));
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const itemToRemove = prev.find((item) => item.id === id);
      if (itemToRemove) URL.revokeObjectURL(itemToRemove.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleCaptionChange = (id: string, text: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption: text } : item))
    );
  };

  const handleClearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setGeneralCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmUpload = async () => {
    if (items.length === 0) {
      setError('Pick at least one photo first.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    let hasGuestUpload = false;
    let successCount = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setUploadProgress(`Uploading ${i + 1} of ${items.length}…`);

        // Combine general caption + individual caption if both are present
        const combinedCaption = item.caption && generalCaption.trim()
          ? `${generalCaption.trim()} - ${item.caption.trim()}`
          : item.caption.trim() || generalCaption.trim();

        const formData = new FormData();
        formData.append('file', item.file);
        if (combinedCaption) formData.append('caption', combinedCaption);
        if (galleryCode) formData.append('galleryCode', galleryCode);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(`Couldn't upload ${item.file.name}: ${data.error || 'unknown error'}`);
        }

        if (data.isGuest) {
          hasGuestUpload = true;
        }

        successCount++;
      }

      setSuccessMsg(
        successCount === 1 ? '1 photo added.' : `${successCount} photos added.`
      );
      handleClearAll();
      onUploaded?.();

      // Inside a gallery the whole point is that no account is needed, so don't
      // nag guests to sign up there. Elsewhere the prompt is unchanged.
      if (hasGuestUpload && !galleryCode) {
        setShowModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong during the upload.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <>
      {/* No panel wrapper — the upload control stays visually light so the
          contact sheet below it keeps the weight on the page. */}
      <div className="upload-zone">
        {error && (
          <div className="alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-success">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />

        {uploading ? (
          <div className="upload-bar">
            <Loader2 size={18} className="animate-spin" />
            <span className="upload-status">{uploadProgress}</span>
          </div>
        ) : items.length === 0 ? (
          /* Step 1 — choose files. A compact row rather than a tall dropzone,
             so the sheet below stays near the top of the page. Files can still
             be dropped anywhere on this row. */
          <div
            className={`upload-bar ${isDragActive ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={16} />
              <span>Choose photos</span>
            </button>

            {actions}
          </div>
        ) : (
          /* Step 2 — review the selection before it goes up. */
          <div>
            <div className="upload-tray-head">
              <span className="state-mono">
                {items.length} photo{items.length > 1 ? 's' : ''} ready
              </span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={13} />
                Add more
              </button>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="album-caption">
                Caption for the whole batch
              </label>
              <input
                id="album-caption"
                type="text"
                className="form-input"
                placeholder="e.g. Class 5A zoo trip"
                value={generalCaption}
                onChange={(e) => setGeneralCaption(e.target.value)}
                maxLength={150}
              />
            </div>

            <div className="upload-tray">
              {items.map((item) => (
                <div key={item.id} className="upload-item">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleRemoveItem(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X size={13} />
                  </button>

                  <div className="upload-item-thumb">
                    <img src={item.previewUrl} alt="" />
                  </div>

                  <input
                    type="text"
                    className="form-input"
                    placeholder="Caption this one…"
                    value={item.caption}
                    onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                    maxLength={200}
                    aria-label={`Caption for ${item.file.name}`}
                  />
                </div>
              ))}
            </div>

            <div className="upload-actions">
              <button
                type="button"
                onClick={handleConfirmUpload}
                className="btn btn-primary"
              >
                <Upload size={16} />
                <span>
                  Upload {items.length} photo{items.length > 1 ? 's' : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="btn btn-secondary"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      <PostUploadModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
