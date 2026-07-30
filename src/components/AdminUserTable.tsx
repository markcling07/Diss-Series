'use client';

import React, { useState } from 'react';
import { Shield, ShieldAlert, UserCheck, AlertCircle } from 'lucide-react';

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
    <div className="panel">
      {error && (
        <div className="alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Photos</th>
              <th>Role</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id}>
                  <td>
                    <span className="table-name">@{user.username}</span>
                    {isSelf && <span className="mono-meta"> (you)</span>}
                  </td>
                  <td>{user.email}</td>
                  <td>{user._count?.photos ?? 0}</td>
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
                      {user.role === 'SUPER_ADMIN' && <ShieldAlert size={11} />}
                      {user.role === 'ADMIN' && <Shield size={11} />}
                      {user.role === 'USER' && <UserCheck size={11} />}
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {isSelf ? (
                      <span className="mono-meta">Primary account</span>
                    ) : user.role === 'ADMIN' ? (
                      <button
                        disabled={updatingId === user.id}
                        onClick={() => handleRoleChange(user.id, 'USER')}
                        className="btn btn-secondary btn-sm"
                      >
                        Revoke admin
                      </button>
                    ) : (
                      <button
                        disabled={updatingId === user.id}
                        onClick={() => handleRoleChange(user.id, 'ADMIN')}
                        className="btn btn-secondary btn-sm"
                      >
                        <Shield size={13} />
                        Make admin
                      </button>
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
