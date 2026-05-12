"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Profile } from "@/lib/types";
import { AlertSeverity } from "@/components/ui/MuiAlert";
import { Modal } from "@/components/ui/Modal";

export function UserRolesTab({ addToast }: { addToast: (msg: string, sev: AlertSeverity) => void }) {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [resettingPassword, setResettingPassword] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                addToast("Failed to fetch users", "error");
            }
        } catch (err) {
            addToast("Network error fetching users", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingId(userId);
        try {
            const res = await fetch(`/api/users/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
                addToast("Role updated successfully", "success");
                await fetchUsers();
            } else {
                const data = await res.json();
                addToast(data.error || "Failed to update role", "error");
            }
        } catch (err) {
            addToast("Network error updating role", "error");
        } finally {
            setUpdatingId(null);
        }
    };

    const handlePasswordReset = async () => {
        if (!selectedUser || !newPassword) return;
        
        if (newPassword.length < 6) {
            addToast("Password must be at least 6 characters", "error");
            return;
        }

        setResettingPassword(true);
        try {
            const res = await fetch(`/api/users/${selectedUser.id}/password`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword }),
            });
            
            if (res.ok) {
                addToast(`Password reset for ${selectedUser.name || selectedUser.email}`, "success");
                setSelectedUser(null);
                setNewPassword("");
            } else {
                const data = await res.json();
                addToast(data.error || "Failed to reset password", "error");
            }
        } catch (err) {
            addToast("Network error resetting password", "error");
        } finally {
            setResettingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <svg className="animate-spin w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-slide-up">
            <GlassCard className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">Name</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">Email</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">Department</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">Role</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-gray-50 hover:bg-brand-50/20 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{user.name || "Unknown"}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{user.email}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.department || "—"}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <select
                                            value={user.role}
                                            disabled={updatingId === user.id}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className="select-field !py-2 !px-3 text-xs font-medium w-auto min-w-[120px]"
                                        >
                                            <option value="user">User</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-5 py-4">
                                        <button
                                            onClick={() => setSelectedUser(user)}
                                            className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                                        >
                                            Reset Password
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-12 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <Modal
                isOpen={!!selectedUser}
                onClose={() => {
                    setSelectedUser(null);
                    setNewPassword("");
                }}
                title={`Reset Password for ${selectedUser?.name || "User"}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enter a new password for <strong>{selectedUser?.email}</strong>.
                    </p>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-field"
                            placeholder="At least 6 characters"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => {
                                setSelectedUser(null);
                                setNewPassword("");
                            }}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePasswordReset}
                            disabled={resettingPassword || !newPassword || newPassword.length < 6}
                            className="btn-primary min-w-[120px]"
                        >
                            {resettingPassword ? (
                                <svg className="animate-spin h-4 w-4 text-white mx-auto" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                "Update Password"
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

