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
import SubProjectAllocation from "./SubProjectAllocation";

const columnHelper = createColumnHelper<RequestRecord>();
 
const downloadFile = async (url: string) => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlBlob;
        const filename = url.split("/").pop()?.split("?")[0] || "document.pdf";
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
        console.error("Download failed:", error);
    }
};

interface RequestsTableProps {
    data: RequestRecord[];
    onUploadReceipt: (request: RequestRecord) => void;
    onUploadSigned: (request: RequestRecord) => void;
}

const RowActions = ({ row, onUploadReceipt, onUploadSigned }: { row: RequestRecord; onUploadReceipt: any; onUploadSigned: any }) => {
    const canUploadReceipt = ["APPROVED", "ACTIVE", "COMPLETED"].includes(row.status);
    const canUploadSigned = row.status === "PENDING_APPROVAL";
    const hasReceipt = row.receipts && row.receipts.length > 0;
    const latestReceipt = hasReceipt ? row.receipts![row.receipts!.length - 1] : null;

    return (
        <div className="flex gap-2 flex-wrap">
            {canUploadSigned && (
                <button
                    onClick={() => onUploadSigned(row)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-all flex items-center gap-1.5"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload Signed PDF
                </button>
            )}
            
            {row.status === "APPROVED" && !row.approval_file_url && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Email Approved
                </span>
            )}

            {canUploadReceipt && (
                <button
                    onClick={() => onUploadReceipt(row)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${latestReceipt
                        ? "bg-brand-50 text-brand-600 border-brand-200"
                        : "bg-white text-gray-600 border-gray-200 hover:border-brand-200 hover:text-brand-600"
                        }`}
                >
                    {latestReceipt ? " Manage Receipts" : " Upload Receipt"}
                </button>
            )}
        </div>
    );
};

export function RequestsTable({ data, onUploadReceipt, onUploadSigned }: RequestsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const columns = useMemo(
        () => [
            columnHelper.accessor("event_id", {
                header: "Event ID",
                cell: (info: any) => (
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/request/${info.row.original.id}`}
                            className="font-mono text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                            title="View Request Details"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            {info.getValue()}
                        </Link>
                    </div>
                ),
            }),
            columnHelper.accessor("project_name", {
                header: "Project",
                cell: (info) => (
                    <span className="text-sm text-gray-600 truncate max-w-[150px] block">
                        {info.getValue() || "N/A"}
                    </span>
                ),
            }),
            columnHelper.accessor("amount", {
                header: "Amount",
                cell: (info) => (
                    <span className="font-semibold text-sm text-gray-700">
                        THB {info.getValue()?.toLocaleString()}
                    </span>
                ),
            }),
            columnHelper.accessor("billing_type", {
                header: "Billing",
                cell: (info) => {
                    const type = info.getValue();
                    const label = type
                        ?.replace("ONE_TIME", "One-time")
                        .replace("YEARLY_MONTHLY", "Yearly (Monthly)")
                        .replace("MONTHLY", "Monthly")
                        .replace("YEARLY", "Yearly");
                    const color =
                        type === "MONTHLY"
                            ? "bg-purple-100 text-purple-700"
                            : type === "YEARLY"
                                ? "bg-blue-100 text-blue-700"
                                : type === "YEARLY_MONTHLY"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "bg-gray-100 text-gray-600";
                    return (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
                            {label}
                        </span>
                    );
                },
            }),
            columnHelper.accessor("status", {
                header: "Status",
                cell: (info) => {
                    const status = info.getValue();
                    const className =
                        status === "PENDING"
                            ? "status-pending"
                            : status === "APPROVED"
                                ? "status-approved"
                                : status === "REJECTED"
                                    ? "status-rejected"
                                    : "status-completed";
                    return <span className={className}>{status}</span>;
                },
            }),
            columnHelper.accessor("created_at", {
                header: "Date",
                cell: (info) => (
                    <span className="text-xs text-gray-500">
                        {new Date(info.getValue()).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })}
                    </span>
                ),
            }),
            columnHelper.display({
                id: "actions",
                header: "Actions",
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
        <div className="glass-card overflow-hidden">
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto scrollbar-thin">
                <table className="w-full">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-gray-100/50">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 transition-colors"
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-1">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getIsSorted() === "asc" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                                            )}
                                            {header.column.getIsSorted() === "desc" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-5 py-16 text-center">
                                    <div className="text-gray-300 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14,2 14,8 20,8" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-gray-400">No requests found</p>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors">
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-5 py-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4 px-4 pt-4 pb-2">
                {table.getRowModel().rows.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No requests found</p>
                ) : (
                    table.getRowModel().rows.map((row) => (
                        <div key={row.original.id} className="glass-card-hover p-4 space-y-3 relative border border-gray-100/50 rounded-xl bg-white shadow-sm">
                            <div className="flex justify-between items-center">
                                <Link
                                    href={`/request/${row.original.id}`}
                                    className="font-mono text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    {row.original.event_id}
                                </Link>
                                <span className="text-xs text-gray-400">
                                    {new Date(row.original.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5">Project</span>
                                <p className="text-sm font-medium text-gray-700 truncate">{row.original.project_name || "N/A"}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5">Amount</span>
                                    <p className="text-sm font-bold text-gray-800">THB {row.original.amount?.toLocaleString()}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    row.original.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                    row.original.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                                }`}>
                                    {row.original.status}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-gray-100/50">
                                <RowActions row={row.original} onUploadReceipt={onUploadReceipt} onUploadSigned={onUploadSigned} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100/50">
                <p className="text-xs text-gray-400">
                    Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                    {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        data.length
                    )}{" "}
                    of {data.length} results
                </p>
                <div className="flex gap-2">
                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/80 border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition-all">Previous</button>
                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/80 border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition-all">Next</button>
                </div>
            </div>
        </div>
    );
}
