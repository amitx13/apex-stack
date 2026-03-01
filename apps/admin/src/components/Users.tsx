// apps/admin/src/pages/Users.tsx

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Search, Filter, Eye,
    CheckCircle2, XCircle, Users as UsersIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UserListItem, PaginationMeta } from "@repo/types";
import api from "@/lib/axios";

const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

const StatusBadge = ({ isActive }: { isActive: boolean }) =>
    isActive ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 max-w-fit rounded-full text-xs font-medium border text-green-400 bg-green-400/10 border-green-400/20">
            <CheckCircle2 className="w-3 h-3" /> Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 max-w-fit rounded-full text-xs font-medium border text-amber-400 bg-amber-400/10 border-amber-400/20">
            <XCircle className="w-3 h-3" /> Not Activated
        </span>
    );

export const Users = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [status, setStatus] = useState("ALL");
    const [page, setPage] = useState(1);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/users", {
                params: { page, limit: 10, search, status },
            });
            setUsers(res.data.data.users);
            setPagination(res.data.data.pagination);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to load members");
        } finally {
            setLoading(false);
        }
    }, [page, search, status]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleSearch = () => { setSearch(searchInput); setPage(1); };
    const handleStatusFilter = (s: string) => { setStatus(s); setPage(1); };

    const STATUS_FILTERS = [
        { label: "All Members", value: "ALL" },
        { label: "Active", value: "ACTIVE" },
        { label: "Not Activated", value: "NOT_ACTIVATED" },
    ];

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Members</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    {pagination
                        ? `${pagination.total.toLocaleString("en-IN")} total members`
                        : "Loading..."}
                </p>
            </div>

            {/* ── Search ── */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, phone or User Id..."
                        className="pl-9 h-10 bg-secondary/50"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="h-10 px-4 shrink-0">
                    Search
                </Button>
            </div>

            {/* ── Filter Pills ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                {STATUS_FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => handleStatusFilter(f.value)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${status === f.value
                            ? "bg-primary/15 text-primary border-primary/30"
                            : "text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── Loading Skeletons ── */}
            {loading && (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            )}

            {/* ── Empty State ── */}
            {!loading && users.length === 0 && (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <UsersIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No members found</p>
                </div>
            )}

            {/* ── Desktop Table (lg+) ── */}
            {!loading && users.length > 0 && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block rounded-xl border border-border bg-card overflow-hidden">
                        {/* Header — 7 columns now */}
                        <div className="grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 border-b border-border bg-secondary/30">
                            {["Member", "Role", "User Id", "Sponsor", "Total Accounts", "Status", ""].map((h) => (
                                <p key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    {h}
                                </p>
                            ))}
                        </div>

                        {/* Rows */}
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors items-center"
                            >
                                {/* Member */}
                                <div>
                                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.phone}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Joined {new Date(user.createdAt).toLocaleDateString("en-IN")}
                                    </p>
                                </div>

                                {/* Role */}
                                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium border ${user.role === "ADMIN"
                                        ? "text-violet-400 bg-violet-400/10 border-violet-400/20"
                                        : "text-cyan-400 bg-cyan-400/10 border-cyan-400/20"
                                    }`}>
                                    {user.role === "ADMIN" ? "Admin" : "Member"}
                                </span>

                                {/* User ID */}
                                <p className="text-sm font-mono text-primary">{user.id}</p>

                                {/* Sponsor */}
                                <div>
                                    {user.sponsor ? (
                                        <>
                                            <p className="text-sm text-foreground">{user.sponsor.name}</p>
                                            <p className="text-xs font-mono text-muted-foreground">{user.sponsor.id}</p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No sponsor</p>
                                    )}
                                </div>

                                {/* Total Accounts */}
                                <p className="text-sm text-foreground">
                                    {user.totalAccounts} {user.totalAccounts === 1 ? "Account" : "Accounts"}
                                </p>

                                {/* Status */}
                                <StatusBadge isActive={user.isActive} />

                                {/* Action */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => navigate(`/users/${user.id}`)}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    View
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* ── Mobile Cards (below lg) ── */}
                    <div className="lg:hidden space-y-3">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="rounded-xl border border-border bg-card p-4 space-y-3"
                            >
                                {/* Top row */}
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.phone}</p>
                                    </div>
                                    <StatusBadge isActive={user.isActive} />
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-secondary/40 rounded-lg px-3 py-2">
                                        <p className="text-muted-foreground mb-0.5">User Id</p>
                                        <p className="font-mono text-primary font-medium">{user.id}</p>
                                    </div>
                                    <div className="bg-secondary/40 rounded-lg px-3 py-2">
                                        <p className="text-muted-foreground mb-0.5">Total Accounts</p>
                                        <p className="text-foreground font-medium">
                                            {user.totalAccounts} {user.totalAccounts === 1 ? "Account" : "Accounts"}
                                        </p>
                                    </div>
                                    <div className="bg-secondary/40 rounded-lg px-3 py-2">
                                        <p className="text-muted-foreground mb-0.5">Sponsor</p>
                                        <p className="text-foreground font-medium truncate">
                                            {user.sponsor ? user.sponsor.name : "No sponsor"}
                                        </p>
                                    </div>
                                    <div className="bg-secondary/40 rounded-lg px-3 py-2">
                                        <p className="text-muted-foreground mb-0.5">Joined</p>
                                        <p className="text-foreground font-medium">
                                            {new Date(user.createdAt).toLocaleDateString("en-IN")}
                                        </p>
                                    </div>
                                </div>

                                {/* View button */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-9 text-xs"
                                    onClick={() => navigate(`/users/${user.id}`)}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                                    View Full Details
                                </Button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── Pagination ── */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, pagination.total)} of{" "}
                        {pagination.total.toLocaleString("en-IN")} members
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline" size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">
                            Page {page} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline" size="sm"
                            disabled={page === pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
