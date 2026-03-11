"use client";

import React, { useState, useMemo } from "react";
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
    ExpandedState,
} from "@tanstack/react-table";
import { RequestRecord } from "@/lib/types";
import SubProjectAllocation from "./SubProjectAllocation";

const columnHelper = createColumnHelper<RequestRecord>();

interface RequestsTableProps {
    data: RequestRecord[];
    onUploadReceipt: (request: RequestRecord) => void;
    onUploadSigned?: (request: RequestRecord) => void;
}

export function RequestsTable({ data, onUploadReceipt, onUploadSigned }: RequestsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const columns = useMemo(
        () => [
            columnHelper.accessor("event_id", {
                header: "Event ID",
                cell: (info: any) => (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => info.row.toggleExpanded()}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`w-3 h-3 text-gray-400 transition-transform ${info.row.getIsExpanded() ? "rotate-180" : "rotate-90"}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="18 15 12 9 6 15" />
                            </svg>
                        </button>
                        <span className="font-mono text-xs font-semibold text-brand-600">
                            {info.getValue()}
                        </span>
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
                cell: (info) => {
                    const row = info.row.original;
                    const canUploadReceipt = ["APPROVED", "ACTIVE", "COMPLETED"].includes(row.status);
                    const canUploadSigned = row.status === "PENDING_APPROVAL";
                    const hasReceipt = row.receipts && row.receipts.length > 0;
                    const latestReceipt = hasReceipt ? row.receipts![row.receipts!.length - 1] : null;

                    return (
                        <div className="flex gap-2">
                            {canUploadSigned && onUploadSigned && (
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
                },
            }),
        ],
        [onUploadReceipt, onUploadSigned]
    );

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnFilters, expanded },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowCanExpand: () => true,
        initialState: {
            pagination: { pageSize: 10 },
        },
    });

    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
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
                                <React.Fragment key={row.id}>
                                    <tr
                                        className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-5 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                    {row.getIsExpanded() && (
                                        <tr>
                                            <td colSpan={columns.length} className="px-5 py-6 bg-gray-50/50">
                                                <div className="max-w-4xl">
                                                    <div className="flex gap-8 mb-6">
                                                        <div>
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Objective</span>
                                                            <p className="text-sm text-gray-700 font-medium">{row.original.objective}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Dates</span>
                                                            <p className="text-sm text-gray-700">
                                                                {new Date(row.original.start_date).toLocaleDateString()} - {new Date(row.original.end_date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <SubProjectAllocation
                                                        requestId={row.original.id}
                                                        totalAmount={row.original.amount}
                                                        isApproved={row.original.status === "APPROVED"}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
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
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/80 border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition-all"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/80 border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 transition-all"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
