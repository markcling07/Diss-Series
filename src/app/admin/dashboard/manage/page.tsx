'use me';
'use client';

import React, { useEffect, useState } from 'react';
import AdminUserTable, { UserItem } from '@/components/AdminUserTable';
import { Users, ShieldAlert, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ManageAdminsPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsersData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();

      if (!meData.user || meData.user.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied: Only SuperAdmin can manage administrator accounts.');
      }

      setCurrentUserId(meData.user.id);

      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();

      if (!usersRes.ok) {
        throw new Error(usersData.error || 'Failed to fetch users');
      }

      setUsers(usersData.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
        <p>Loading User Permissions Management...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>SuperAdmin Access Required</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {error}
          </p>
          <Link href="/admin/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/admin/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            marginBottom: '1rem',
          }}
        >
          <ArrowLeft size={16} />
          Back to Photo Dashboard
        </Link>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldAlert style={{ color: '#ec4899' }} />
          Manage Admin Access
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          As SuperAdmin, you can grant or revoke administrator access for registered accounts.
        </p>
      </div>

      <AdminUserTable
        users={users}
        currentUserId={currentUserId}
        onUserRoleUpdated={fetchUsersData}
      />
    </div>
  );
}
