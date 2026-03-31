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
    const [isAdding, setIsAdding] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [newProject, setNewProject] = useState({
        projectName: ""
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

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

    const handleImportInitial = async () => {
        if (!confirm("This will import the initial set of predefined projects. Continue?")) return;
        setIsImporting(true);
        setError(null);

        try {
            let successCount = 0;
            for (const name of INITIAL_PROJECTS) {
                // Check if already exists (simple client-side check)
                if (projects.some(p => p.project_name.toLowerCase() === name.toLowerCase())) {
                    continue;
                }
                const res = await fetch("/api/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectName: name }),
                });
                if (res.ok) successCount++;
            }
            alert(`Successfully imported ${successCount} new projects.`);
            fetchProjects();
        } catch (err) {
            setError("Failed during bulk import.");
            console.error(err);
        } finally {
            setIsImporting(false);
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <svg className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No projects found</p>
                                            <p className="text-sm mt-1">Click "Import List" to load initial data, or add a new one manually.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project) => (
                                    <tr key={project.id} className="hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-800 dark:text-gray-200">
                                                {project.project_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(project.created_at).toLocaleDateString('en-GB')}
                                        </td>
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
