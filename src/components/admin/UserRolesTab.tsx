"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Profile } from "@/lib/types";
import { AlertSeverity } from "@/components/ui/MuiAlert";

export function UserRolesTab({ addToast }: { addToast: (msg: string, sev: AlertSeverity) => void }) {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

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
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-gray-50 hover:bg-brand-50/20 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-semibold text-gray-800">{user.name || "Unknown"}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-sm text-gray-600 truncate max-w-[200px]">{user.email}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-xs text-gray-500">{user.department || "—"}</p>
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
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-12 text-center text-gray-400 text-sm">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
