'use me';
'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, X, Upload, Plus, FolderPlus } from 'lucide-react';
import PostUploadModal from './PostUploadModal';

interface PreviewItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

export default function UploadForm() {
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
        errors.push(`"${selectedFile.name}" is not a valid image format.`);
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        errors.push(`"${selectedFile.name}" exceeds the 10MB limit.`);
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
      setError('Please select at least one photo.');
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
        setUploadProgress(`Uploading photo ${i + 1} of ${items.length}...`);

        // Combine general caption + individual caption if both are present
        const combinedCaption = item.caption && generalCaption.trim()
          ? `${generalCaption.trim()} - ${item.caption.trim()}`
          : item.caption.trim() || generalCaption.trim();

        const formData = new FormData();
        formData.append('file', item.file);
        if (combinedCaption) formData.append('caption', combinedCaption);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(`Failed uploading ${item.file.name}: ${data.error || 'Unknown error'}`);
        }

        if (data.isGuest) {
          hasGuestUpload = true;
        }

        successCount++;
      }

      setSuccessMsg(
        successCount === 1
          ? '1 photo uploaded successfully!'
          : `All ${successCount} photos uploaded successfully!`
      );
      handleClearAll();

      if (hasGuestUpload) {
        setShowModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
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
      <div className="upload-card glass-panel">
        <div>
          {error && (
            <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Hidden File Input for Multiple Files */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />

          {uploading ? (
            <div className="dropzone" style={{ cursor: 'default' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>{uploadProgress}</p>
            </div>
          ) : items.length === 0 ? (
            /* STEP 1: DROP / SELECT MULTIPLE FILES */
            <div
              className={`dropzone ${isDragActive ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-icon">
                <UploadCloud size={32} />
              </div>

              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Drag & drop your pictures here
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  or click to select multiple files from your device
                </p>
              </div>

              <span className="badge badge-guest" style={{ marginTop: '0.5rem' }}>
                Select multiple JPG, PNG, GIF, WebP up to 10MB each
              </span>
            </div>
          ) : (
            /* STEP 2: PREVIEW ALL SELECTED IMAGES BEFORE UPLOAD */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  📸 Selected Photos ({items.length} image{items.length > 1 ? 's' : ''})
                </div>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={14} />
                  Add More Photos
                </button>
              </div>

              {/* General / Album Caption Field */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">
                  General Album Caption / Collection Title (Applies to all photos)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Summer Vacation 2026, Birthday Party, Event Album..."
                  value={generalCaption}
                  onChange={(e) => setGeneralCaption(e.target.value)}
                  maxLength={150}
                />
              </div>

              {/* Grid of Preview Cards with Individual Captions */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  background: '#fafafa',
                  marginBottom: '1rem',
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '8px',
                      background: '#fff',
                      position: 'relative',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove image"
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                      }}
                    >
                      <X size={14} />
                    </button>

                    <div
                      style={{
                        width: '100%',
                        height: '130px',
                        overflow: 'hidden',
                        borderRadius: '3px',
                        background: '#eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={item.previewUrl}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    <div style={{ marginTop: '6px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontSize: '0.8rem', padding: '4px 6px' }}
                        placeholder="Photo-specific caption..."
                        value={item.caption}
                        onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                        maxLength={200}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Upload size={18} />
                  <span>Confirm & Upload {items.length} Photo{items.length > 1 ? 's' : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="btn btn-secondary"
                >
                  Cancel All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PostUploadModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
