"use client";

import { useState, useEffect } from "react";

interface SubProject {
    id: string;
    request_id: string;
    name: string;
    amount: number;
    created_at: string;
}

interface SubProjectAllocationProps {
    requestId: string;
    totalAmount: number;
    isApproved: boolean;
}

export default function SubProjectAllocation({ requestId, totalAmount, isApproved }: SubProjectAllocationProps) {
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [namesInput, setNamesInput] = useState("");

    const fetchSubProjects = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/requests/${requestId}/sub-projects`);
            if (res.ok) {
                const data = await res.json();
                setSubProjects(data.subProjects || []);
                // If there are existing sub-projects, populate the input
                if (data.subProjects && data.subProjects.length > 0) {
                    setNamesInput(data.subProjects.map((sp: SubProject) => sp.name).join(", "));
                }
            } else {
                setError("Failed to fetch sub-projects");
            }
        } catch (err: any) {
            setError(err.message || "Error fetching sub-projects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (requestId) {
            fetchSubProjects();
        }
    }, [requestId]);

    const handleSave = async () => {
        if (!namesInput.trim()) {
            // If empty, delete all
            handleDeleteAll();
            return;
        }

        const names = namesInput.split(",").map(n => n.trim()).filter(n => n);
        if (names.length === 0) return;

        try {
            setSaving(true);
            setError(null);
            const res = await fetch(`/api/requests/${requestId}/sub-projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ names, totalAmount })
            });

            if (res.ok) {
                await fetchSubProjects();
                alert("Sub-projects allocated successfully!");
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save sub-projects");
            }
        } catch (err: any) {
            setError(err.message || "Error saving sub-projects");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to remove all sub-project allocations?")) return;

        try {
            setSaving(true);
            setError(null);
            const res = await fetch(`/api/requests/${requestId}/sub-projects`, {
                method: "DELETE"
            });

            if (res.ok) {
                setSubProjects([]);
                setNamesInput("");
            } else {
                const data = await res.json();
                setError(data.error || "Failed to delete sub-projects");
            }
        } catch (err: any) {
            setError(err.message || "Error deleting sub-projects");
        } finally {
            setSaving(false);
        }
    };

    if (!isApproved) return null;

    if (loading) {
        return <div className="text-xs text-gray-400 mt-2">Loading allocations...</div>;
    }

    return (
        <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Sub-Project Allocations</h4>
            <p className="text-xs text-gray-500 mb-3">
                Divide the total requested amount (THB {totalAmount.toLocaleString()}) logically into multiple sub-projects.
            </p>

            <div className="flex gap-2 items-start mb-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="e.g. Project 1, Project 2, Project 3"
                        value={namesInput}
                        onChange={(e) => setNamesInput(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Separate names with commas. Amount will be divided equally.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Allocate"}
                </button>
                {subProjects.length > 0 && (
                    <button
                        onClick={handleDeleteAll}
                        disabled={saving}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 border border-red-200"
                        title="Clear Allocations"
                    >
                        Clear
                    </button>
                )}
            </div>

            {error && (
                <p className="text-xs text-red-500 mb-3">{error}</p>
            )}

            {subProjects.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-500">Sub-Project Name</th>
                                <th scope="col" className="px-4 py-2 text-right font-medium text-gray-500">Allocated Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {subProjects.map((sp) => (
                                <tr key={sp.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-gray-700 font-medium">{sp.name}</td>
                                    <td className="px-4 py-2 text-right text-gray-600">THB {Number(sp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                                <td className="px-4 py-2 text-gray-700">Total</td>
                                <td className="px-4 py-2 text-right text-brand-600">
                                    THB {subProjects.reduce((sum, sp) => sum + Number(sp.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
