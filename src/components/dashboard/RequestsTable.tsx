"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    ColumnFiltersState,
} from "@tanstack/react-table";
import { RequestRecord } from "@/lib/types";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
    ExternalLink, 
    Upload, 
    MailCheck, 
    FileCheck, 
    Receipt, 
    ChevronLeft, 
    ChevronRight,
    ArrowUpDown,
    MoreHorizontal,
    FileQuestion
} from "lucide-react";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<RequestRecord>();

interface RequestsTableProps {
    data: RequestRecord[];
    onUploadReceipt: (request: RequestRecord) => void;
    onUploadSigned: (request: RequestRecord) => void;
}

const RowActions = ({ row, onUploadReceipt, onUploadSigned }: { row: RequestRecord; onUploadReceipt: any; onUploadSigned: any }) => {
    const canUploadReceipt = ["APPROVED", "ACTIVE", "COMPLETED"].includes(row.status);
    const canUploadSigned = row.status === "PENDING_APPROVAL";
    const hasReceipt = row.receipts && row.receipts.length > 0;

    return (
        <div className="flex gap-2 flex-wrap justify-end">
            {canUploadSigned && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUploadSigned(row)}
                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 hover:text-purple-800 transition-all gap-1.5"
                >
                    <Upload className="w-3 h-3" />
                    Upload Signed
                </Button>
            )}

            {row.status === "APPROVED" && !row.approval_file_url && (
                <Badge variant="success" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-1.5 italic">
                    <MailCheck className="w-3 h-3" />
                    Email Approved
                </Badge>
            )}

            {canUploadReceipt && (
                <Button
                    size="sm"
                    variant={hasReceipt ? "brand" : "outline"}
                    onClick={() => onUploadReceipt(row)}
                    className={cn(
                        "h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-1.5 transition-all",
                        !hasReceipt && "bg-white border-gray-100 text-gray-500 hover:border-brand-200 hover:text-brand-700"
                    )}
                >
                    <Receipt className="w-3 h-3" />
                    {hasReceipt ? "Manage Receipts" : "Upload Receipt"}
                </Button>
            )}
        </div>
    );
};

export function RequestsTable({ data, onUploadReceipt, onUploadSigned }: RequestsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const columns = useMemo(
        () => [
            columnHelper.accessor("req_id", {
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent text-[10px] font-black uppercase tracking-widest"
                    >
                        ID <ArrowUpDown className="ml-1 w-2.5 h-2.5" />
                    </Button>
                ),
                cell: (info) => {
                    const row = info.row.original;
                    return (
                        <Link
                            href={`/request/${row.id}`}
                            className="font-mono text-xs font-black text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1.5 group"
                        >
                            <ExternalLink className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                            {info.getValue()}
                        </Link>
                    );
                },
            }),
            columnHelper.accessor("project_name", {
                header: "Project Distribution",
                cell: (info) => (
                    <div className="max-w-[180px]">
                        <p className="text-sm font-bold text-gray-900 truncate">{info.getValue() || "N/A"}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Cost Center Primary</p>
                    </div>
                ),
            }),
            columnHelper.accessor("amount", {
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="p-0 hover:bg-transparent text-[10px] font-black uppercase tracking-widest"
                    >
                        Amount <ArrowUpDown className="ml-1 w-2.5 h-2.5" />
                    </Button>
                ),
                cell: (info) => (
                    <div className="font-black text-sm text-gray-900">
                        <span className="text-[10px] font-bold text-gray-400 mr-1">THB</span>
                        {info.getValue()?.toLocaleString()}
                    </div>
                ),
            }),
            columnHelper.accessor("billing_type", {
                header: "Expenditure Type",
                cell: (info) => {
                    const type = info.getValue();
                    const label = type
                        ?.replace("ONE_TIME", "One-time")
                        .replace("YEARLY_MONTHLY", "Yearly (Monthly)")
                        .replace("MONTHLY", "Monthly")
                        .replace("YEARLY", "Yearly");
                    
                    let variant: "secondary" | "outline" | "info" = "outline";
                    if (type === "MONTHLY") variant = "secondary";
                    
                    return (
                        <Badge variant={variant} className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 border-gray-100 bg-gray-50/50">
                            {label}
                        </Badge>
                    );
                },
            }),
            columnHelper.accessor("status", {
                header: "Current State",
                cell: (info) => {
                    const status = info.getValue() as string;
                    let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" = "outline";
                    
                    if (status === "APPROVED" || status === "COMPLETED" || status === "ACTIVE") variant = "success";
                    else if (status === "PENDING" || status === "PENDING_APPROVAL") variant = "warning";
                    else if (status === "REJECTED" || status === "CANCELLED") variant = "destructive";

                    return (
                        <Badge variant={variant} className="h-5 text-[9px] font-black uppercase tracking-widest">
                            {status}
                        </Badge>
                    );
                },
            }),
            columnHelper.accessor("created_at", {
                header: "Initiated",
                cell: (info) => (
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">
                        {new Date(info.getValue()).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })}
                    </div>
                ),
            }),
            columnHelper.display({
                id: "actions",
                header: () => <div className="text-right pr-4">Operations</div>,
                cell: (info) => <RowActions row={info.row.original} onUploadReceipt={onUploadReceipt} onUploadSigned={onUploadSigned} />,
            }),
        ],
        [onUploadReceipt, onUploadSigned]
    );

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        initialState: {
            pagination: { pageSize: 10 },
        },
    });

    return (
        <Card glass className="border-none shadow-xl bg-white/50 backdrop-blur-md overflow-hidden">
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-gray-100">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <FileQuestion className="w-10 h-10 text-gray-200" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching records found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="border-gray-50 hover:bg-white/80 transition-colors group">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-4 px-6">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100/50">
                {table.getRowModel().rows.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 text-xs font-black uppercase tracking-widest">No records found</div>
                ) : (
                    table.getRowModel().rows.map((row) => (
                        <div key={row.original.id} className="p-6 space-y-4 hover:bg-white/80 transition-colors">
                            <div className="flex justify-between items-center">
                                <Link
                                    href={`/request/${row.original.id}`}
                                    className="font-mono text-xs font-black text-brand-600 flex items-center gap-1.5"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    {row.original.req_id}
                                </Link>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                    {new Date(row.original.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Project Detail</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{row.original.project_name || "N/A"}</p>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Expenditure</p>
                                    <p className="text-sm font-black text-gray-900">THB {row.original.amount?.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50 mb-1">State</p>
                                    <Badge variant={row.original.status === "APPROVED" ? "success" : "warning"} className="h-5 text-[9px] font-black uppercase">
                                        {row.original.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="pt-4 mt-2">
                                <RowActions row={row.original} onUploadReceipt={onUploadReceipt} onUploadSigned={onUploadSigned} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30 gap-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Showing <span className="text-gray-900">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to{" "}
                    <span className="text-gray-900">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}</span>{" "}
                    of <span className="text-gray-900">{data.length}</span> entries
                </p>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => table.previousPage()} 
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white border-gray-200"
                    >
                        <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => table.nextPage()} 
                        disabled={!table.getCanNextPage()}
                        className="h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white border-gray-200"
                    >
                        Next <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
