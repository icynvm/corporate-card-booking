"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface CreditCard {
    id: string;
    card_no: string;
    card_name: string;
    bank: string;
    description: string;
    created_at: string;
}

export default function CreditCardMasterPage() {
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newCard, setNewCard] = useState({
        cardNo: "",
        cardName: "",
        bank: "",
        description: ""
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            const res = await fetch("/api/master-data/cards");
            if (res.ok) {
                const data = await res.json();
                setCards(data);
            }
        } catch (err) {
            console.error("Failed to fetch cards:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await fetch("/api/master-data/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCard),
            });

            if (res.ok) {
                setNewCard({ cardNo: "", cardName: "", bank: "", description: "" });
                setIsAdding(false);
                fetchCards();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to add credit card");
            }
        } catch (err) {
            setError("Failed to connect to server");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this credit card?")) return;
        try {
            const res = await fetch(`/api/master-data/cards?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchCards();
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
                        Credit Card <span className="gradient-text">Management</span>
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage the master list of corporate credit cards.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="btn-primary flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {isAdding ? "Cancel" : "Add New Card"}
                </button>
            </div>

            {isAdding && (
                <div className="mb-8 animate-slide-down">
                    <GlassCard>
                        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Add Credit Card</h2>
                        <form onSubmit={handleAddCard} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="label-text">Card Number</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Full number"
                                    value={newCard.cardNo}
                                    onChange={(e) => setNewCard({ ...newCard, cardNo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-text">Card Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="e.g. Corporate A"
                                    value={newCard.cardName}
                                    onChange={(e) => setNewCard({ ...newCard, cardName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-text">Bank</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. KBank"
                                    value={newCard.bank}
                                    onChange={(e) => setNewCard({ ...newCard, bank: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-text">Description</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Optional"
                                    value={newCard.description}
                                    onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                                <button type="submit" className="btn-primary">Save Card</button>
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
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Card Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Number</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : cards.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">No cards found.</td>
                                </tr>
                            ) : (
                                cards.map((card) => (
                                    <tr key={card.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{card.card_name}</div>
                                            <div className="text-[10px] text-gray-400">{card.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono tracking-wider">
                                            {card.card_no}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold">
                                                {card.bank || "N/A"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(card.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
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
