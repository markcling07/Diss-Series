'use client';

import React, { useEffect, useState } from 'react';
import AdminUserTable, { UserItem } from '@/components/AdminUserTable';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
        throw new Error('Only a super admin can change who has administrator access.');
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
      <div className="state">
        <Loader2 size={28} className="animate-spin" />
        <p className="state-mono" style={{ marginTop: '1rem' }}>
          Loading accounts
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-narrow">
        <span className="eyebrow">Super admin only</span>
        <h1 className="state-title">You can&rsquo;t open this page.</h1>
        <p className="state-text">{error}</p>
        <Link href="/admin/dashboard" className="btn btn-primary">
          Back to the dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/admin/dashboard" className="link-quiet">
          <ArrowLeft size={14} />
          Back to photos
        </Link>
      </div>

      <div className="page-header">
        <div>
          <span className="eyebrow">Access</span>
          <h1 className="page-title">Who can administer.</h1>
          <p className="page-subtitle">
            Grant or revoke administrator access for any registered account.
          </p>
        </div>
      </div>

      <AdminUserTable
        users={users}
        currentUserId={currentUserId}
        onUserRoleUpdated={fetchUsersData}
      />
    </div>
  );
}
