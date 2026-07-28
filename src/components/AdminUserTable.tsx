'use client';

import React, { useState } from 'react';
import { Shield, ShieldAlert, UserCheck, Check, AlertCircle } from 'lucide-react';

export interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  _count?: {
    photos: number;
  };
}

interface Props {
  users: UserItem[];
  currentUserId: string;
  onUserRoleUpdated: () => void;
}

export default function AdminUserTable({ users, currentUserId, onUserRoleUpdated }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }

      onUserRoleUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      {error && (
        <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Uploaded Photos</th>
              <th>Current Role</th>
              <th>Grant / Change Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      @{user.username} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(You)</span>}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user._count?.photos ?? 0} photos</td>
                  <td>
                    <span
                      className={`badge ${
                        user.role === 'SUPER_ADMIN'
                          ? 'badge-superadmin'
                          : user.role === 'ADMIN'
                          ? 'badge-admin'
                          : 'badge-user'
                      }`}
                    >
                      {user.role === 'SUPER_ADMIN' && <ShieldAlert size={12} />}
                      {user.role === 'ADMIN' && <Shield size={12} />}
                      {user.role === 'USER' && <UserCheck size={12} />}
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {isSelf ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>SuperAdmin (Primary)</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {user.role !== 'ADMIN' && (
                          <button
                            disabled={updatingId === user.id}
                            onClick={() => handleRoleChange(user.id, 'ADMIN')}
                            className="btn btn-secondary btn-sm"
                            style={{ borderColor: 'rgba(168, 85, 247, 0.4)', color: '#d8b4fe' }}
                          >
                            <Shield size={14} />
                            Make Admin
                          </button>
                        )}

                        {user.role === 'ADMIN' && (
                          <button
                            disabled={updatingId === user.id}
                            onClick={() => handleRoleChange(user.id, 'USER')}
                            className="btn btn-secondary btn-sm"
                          >
                            Revoke Admin
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
