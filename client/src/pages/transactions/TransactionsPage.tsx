import { useState } from "react";
import { Plus, Search, Trash2, Pencil, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionForm } from "./TransactionForm";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useCurrency, formatRelativeDate } from "@/lib/utils";
import type { Transaction } from "@/types";

export function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();

  const { data, isLoading } = useTransactions({ search, limit: 100 });
  const deleteTransaction = useDeleteTransaction();
  const { format } = useCurrency();

  const transactions = data?.transactions ?? [];

  // Group by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    const date = new Date(t.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  function handleEdit(t: Transaction) {
    setEditing(t);
    setFormOpen(true);
  }

  function handleClose() {
    setEditing(undefined);
    setFormOpen(false);
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} total entries
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ArrowUpRight className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No transactions yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Add your first income or expense to start tracking</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" /> Add transaction
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{date}</p>
              <div className="space-y-2">
                <AnimatePresence>
                  {items.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (t.category?.colorHex ?? "#6B7280") + "20" }}
                      >
                        {t.type === "income" ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.merchantName || t.description || t.category?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            className="text-xs"
                            style={{
                              backgroundColor: (t.category?.colorHex ?? "#6B7280") + "20",
                              color: t.category?.colorHex ?? "#6B7280",
                            }}
                          >
                            {t.category?.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatRelativeDate(t.date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`font-semibold tabular-nums text-sm ${t.type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                          {t.type === "income" ? "+" : "-"}{format(t.amount)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteTransaction.mutate(t.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionForm open={formOpen} onClose={handleClose} transaction={editing} />

      {/* FAB on mobile */}
      <button
        onClick={() => setFormOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
