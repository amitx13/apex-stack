import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, GitBranch, Clock, Users as UsersIcon, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import type { ReentryQueueItem, PaginationMeta } from "@repo/types";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

export const ReentryQueue = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReentryQueueItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/reentry", {
        params: { page, limit: 10, search },
      });
      setItems(res.data.data.items);
      setPagination(res.data.data.pagination);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to load re-entry waiting list"
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Re-entry Waiting List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Members who are in the queue for re-entry
          </p>
        </div>
        {pagination && (
          <p className="text-xs text-muted-foreground">
            {pagination.total.toLocaleString("en-IN")} members in waiting list
          </p>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone or userId..."
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

      {/* Loading / Empty / List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <UsersIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No members in the waiting list</p>
        </div>
      ) : (
        <>
          {/* Desktop: table-style */}
          <div className="hidden lg:block rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 border-b border-border bg-secondary/30">
              {["Member", "UserId", "Total Accounts", "Incentive Wallet", "Waiting Since", ""].map(
                (h) => (
                  <p
                    key={h}
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </p>
                )
              )}
            </div>
            {items.map((item) => {
              const u = item.user;
              const incentiveWallet =
                u.wallets.find((w) => w.type === "INCENTIVE")?.balance ?? 0;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors items-center"
                >
                  {/* Member */}
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      Accounts: {u.accounts.length}
                    </p>
                  </div>

                  {/* user ID */}
                  <p className="text-sm font-mono text-primary">{u.id}</p>

                  {/* Total Accounts */}
                  <p className="text-sm text-foreground">
                    {u.accounts.length}{" "}
                    {u.accounts.length === 1 ? "account" : "accounts"}
                  </p>

                  {/* Incentive Wallet */}
                  <p className="text-sm text-foreground">{fmt(Number(incentiveWallet))}</p>

                  {/* Waiting since */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>

                  {/* Action */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => navigate(`/users/${u.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Mobile: cards */}
          <div className="lg:hidden space-y-3">
            {items.map((item) => {
              const u = item.user;
              const incentiveWallet =
                u.wallets.find((w) => w.type === "INCENTIVE")?.balance ?? 0;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.phone}</p>
                      <p className="text-xs text-muted-foreground">
                        user Id: <span className="font-mono text-primary">{u.id}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10">
                        <GitBranch className="w-3 h-3 text-primary" />
                        <span className="text-[11px] font-medium text-primary">
                          {u.accounts.length}{" "}
                          {u.accounts.length === 1 ? "Account" : "Accounts"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          Waiting since{" "}
                          {new Date(item.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-secondary/40 rounded-lg px-3 py-2">
                      <p className="text-muted-foreground mb-0.5">Incentive Wallet</p>
                      <p className="text-foreground font-medium">
                        {fmt(Number(incentiveWallet))}
                      </p>
                    </div>
                    <div className="bg-secondary/40 rounded-lg px-3 py-2">
                      <p className="text-muted-foreground mb-0.5">Total Accounts</p>
                      <p className="text-foreground font-medium">
                        {u.accounts.length}{" "}
                        {u.accounts.length === 1 ? "Account" : "Accounts"}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-9 text-xs"
                    onClick={() => navigate(`/users/${u.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Full Member
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {((page - 1) * 10) + 1}–
            {Math.min(page * 10, pagination.total)} of{" "}
            {pagination.total.toLocaleString("en-IN")} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
