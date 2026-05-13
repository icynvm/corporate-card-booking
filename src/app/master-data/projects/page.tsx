"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface ProjectMaster {
    id: string;
    project_name: string;
    created_at: string;
}

const INITIAL_PROJECTS = [
    "Pet Variety",
    "Cat Lovers Fair",
    "IMPACT X Shell Shuan Shim",
    "The Cellar Tales Wine Shop",
    "Thailand International Dog Show",
    "IMPACT Speed Fest",
    "DigiTech ASEAN Thailand",
    "The Foodism Show",
    "Thailand Health & Wellness Expo",
    "Thailand International Woodworking & Furniture Exhibition",
    "Building Construction Technology Expo",
    "Thailand International Pet Variety Exhibition",
    "Loy Rim Lake"
];

export default function ProjectMasterPage() {
    const [projects, setProjects] = useState<ProjectMaster[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("");
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newProject, setNewProject] = useState({
        projectName: ""
    });
    const [editName, setEditName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const canManage = userRole === "admin" || userRole === "manager";

    useEffect(() => {
        fetchProjects();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.user?.role || "");
            }
        } catch {}
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch("/api/projects");
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (err) {
            console.error("Failed to fetch projects:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newProject),
            });

            if (res.ok) {
                setNewProject({ projectName: "" });
                setIsAdding(false);
                fetchProjects();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to add project");
            }
        } catch (err) {
            setError("Failed to connect to server");
        }
    };

    const handleEdit = (project: ProjectMaster) => {
        setEditingId(project.id);
        setEditName(project.project_name);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await fetch("/api/projects", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editingId, projectName: editName }),
            });

            if (res.ok) {
                setEditingId(null);
                fetchProjects();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update project");
            }
        } catch (err) {
            setError("Failed to connect to server");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;
        try {
            const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchProjects();
            }
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                        Projects <span className="gradient-text">Management</span>
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage defined promotional projects available for requests.
                    </p>
                </div>
                {canManage && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            {isAdding ? "Cancel" : "Add New"}
                        </button>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="mb-8 animate-slide-down">
                    <GlassCard>
                        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Add New Project</h2>
                        <form onSubmit={handleAddProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label-text text-[10px] uppercase font-bold text-gray-400">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="e.g. Pet Variety"
                                    value={newProject.projectName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProject({ ...newProject, projectName: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button type="submit" className="btn-primary">Save Project</button>
                            </div>
                        </form>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </GlassCard>
                </div>
            )}

            <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800/50">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created At</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No projects found</p>
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project) => (
                                    <tr key={project.id} className="hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors group">
                                        {editingId === project.id ? (
                                            <td colSpan={3} className="px-6 py-4">
                                                <form onSubmit={handleUpdate} className="flex gap-4 items-end">
                                                    <div className="flex-1">
                                                        <label className="label-text text-[10px] uppercase font-bold text-gray-400">Project Name</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            className="input-field"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button type="submit" className="btn-primary">Update</button>
                                                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">Cancel</button>
                                                    </div>
                                                </form>
                                            </td>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-gray-800 dark:text-gray-200">
                                                        {project.project_name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(project.created_at).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {canManage && (
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                onClick={() => handleEdit(project)}
                                                                className="p-2 text-gray-400 hover:text-brand-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Edit"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(project.id)}
                                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Delete"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
