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
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-icon">
          <UserPlus size={32} />
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Photo Uploaded Successfully! 🎉
        </h3>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          You uploaded this photo as a <strong style={{ color: '#cbd5e1' }}>Guest</strong>. 
          Without an account, <strong style={{ color: '#fca5a5' }}>you cannot view your upload history</strong> after leaving this page.
        </p>

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
            color: '#fde047',
            textAlign: 'left',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>Creating a free account lets you track, manage, and view all your uploaded photos anytime!</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/register" className="btn btn-primary" style={{ width: '100%' }}>
            <UserPlus size={18} />
            <span>Create Free Account</span>
          </Link>

          <Link href="/login" className="btn btn-secondary" style={{ width: '100%' }}>
            <LogIn size={18} />
            <span>Already have an account? Sign In</span>
          </Link>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '100%', opacity: 0.7, fontSize: '0.85rem' }}
          >
            Continue as Guest (No History)
          </button>
        </div>
      </div>
    </div>
  );
}
