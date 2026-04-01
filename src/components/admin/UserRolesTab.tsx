"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
    Table, 
    TableBody, 
    TableCaption, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Profile } from "@/lib/types";
import { AlertSeverity } from "@/components/ui/MuiAlert";
import { 
    Users, 
    Mail, 
    Building2, 
    ShieldCheck, 
    Loader2, 
    ChevronDown,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function UserRolesTab({ addToast }: { addToast: (msg: string, sev: AlertSeverity) => void }) {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

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

    const filteredUsers = users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Synchronizing Directory</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                        placeholder="Search users..." 
                        className="pl-10 bg-white/50 border-gray-100 italic text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Badge variant="outline" className="w-fit h-7 px-3 bg-gray-50 border-gray-200 text-gray-500 font-bold">
                    {filteredUsers.length} MEMBERS FOUND
                </Badge>
            </div>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-gray-100">
                            <TableHead className="w-[280px] py-4 px-6">
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <Users className="w-3 h-3" /> Identity
                                </span>
                            </TableHead>
                            <TableHead>
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <Mail className="w-3 h-3" /> Contact
                                </span>
                            </TableHead>
                            <TableHead>
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <Building2 className="w-3 h-3" /> Department
                                </span>
                            </TableHead>
                            <TableHead className="text-right pr-6">
                                <span className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <ShieldCheck className="w-3 h-3" /> Authorization
                                </span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center text-gray-400 italic">
                                    No records matching your search terms.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} className="border-gray-50 hover:bg-white/80 transition-colors group">
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-black">
                                                {user.name?.charAt(0) || "?"}
                                            </div>
                                            <span className="text-sm font-bold text-gray-900 group-hover:text-brand-700 transition-colors">
                                                {user.name || "System Record"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium text-gray-500">
                                        {user.email}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tight bg-gray-50/50 border-none">
                                            {user.department || "Independent"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="relative inline-block text-left">
                                            <select
                                                value={user.role}
                                                disabled={updatingId === user.id}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className={cn(
                                                    "appearance-none h-8 w-28 rounded-lg border border-gray-100 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all focus:ring-2 focus:ring-brand-200 focus:border-brand-300 disabled:opacity-50 cursor-pointer text-center",
                                                    user.role === 'admin' ? "text-red-600 bg-red-50 border-red-100" : 
                                                    user.role === 'manager' ? "text-brand-600 bg-brand-50 border-brand-100" :
                                                    "text-gray-600"
                                                )}
                                            >
                                                <option value="user">USER</option>
                                                <option value="manager">MANAGER</option>
                                                <option value="admin">ADMIN</option>
                                            </select>
                                            <ChevronDown className="absolute right-2 top-2.5 h-3 w-3 opacity-30 pointer-events-none" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
