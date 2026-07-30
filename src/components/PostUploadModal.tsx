'use client';

import React from 'react';
import Link from 'next/link';
import { UserPlus, LogIn, AlertCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PostUploadModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <span className="eyebrow">Uploaded as guest</span>

        <h3 className="modal-title">Your photo is up.</h3>

        <p className="modal-text">
          You uploaded without an account, so this photo won&apos;t appear in any upload
          history once you leave the page. It stays in the archive — you just won&apos;t
          be able to find it again from here.
        </p>

        <div className="notice">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>An account keeps every photo you add in one list you can come back to.</span>
        </div>

        <div className="modal-actions">
          <Link href="/register" className="btn btn-primary btn-block">
            <UserPlus size={16} />
            <span>Create an account</span>
          </Link>

          <Link href="/login" className="btn btn-secondary btn-block">
            <LogIn size={16} />
            <span>Sign in</span>
          </Link>

          <button onClick={onClose} className="btn btn-secondary btn-block">
            Keep going as a guest
          </button>
        </div>
      </div>
    </div>
  );
}
