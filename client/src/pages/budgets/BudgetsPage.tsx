import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Loader2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, type BudgetEntry } from "@/hooks/useBudgets";
import { useCurrency } from "@/lib/utils";

const schema = z.object({
  categoryId: z.string().optional(),
  amount: z.coerce.number().positive("Enter a positive amount"),
});
type FormData = z.infer<typeof schema>;

function fmt(month: string) {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function stepMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function progressColor(pct: number) {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 90) return "bg-orange-500";
  if (pct >= 75) return "bg-yellow-400";
  return "bg-emerald-500";
}

function statusLabel(pct: number) {
  if (pct >= 100) return { text: "Over budget", className: "text-red-500" };
  if (pct >= 90) return { text: "Almost full", className: "text-orange-500" };
  if (pct >= 75) return { text: "75% used", className: "text-yellow-500" };
  return { text: "On track", className: "text-emerald-500" };
}

interface BudgetFormProps {
  open: boolean;
  onClose: () => void;
  month: string;
  editing?: BudgetEntry;
}

function BudgetForm({ open, onClose, month, editing }: BudgetFormProps) {
  const { data: categories = [] } = useCategories();
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: editing?.categoryId ?? undefined, amount: editing?.amount },
  });

  async function onSubmit(data: FormData) {
    const payload = {
      month,
      amount: data.amount,
      categoryId: data.categoryId === "overall" ? null : (data.categoryId ?? null),
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit budget" : "New budget"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              defaultValue={editing?.categoryId ?? "overall"}
              onValueChange={(v) => setValue("categoryId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Overall (all spending)</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.colorHex }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Budget amount</Label>
            <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save changes" : "Create budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetEntry | undefined>();
  const { data: budgets = [], isLoading } = useBudgets(month);
  const deleteBudget = useDeleteBudget(month);
  const { format } = useCurrency();

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.filter((b) => b.categoryId !== null).reduce((s, b) => s + b.spent, 0);

  function handleEdit(b: BudgetEntry) {
    setEditing(b);
    setFormOpen(true);
  }

  function handleClose() {
    setEditing(undefined);
    setFormOpen(false);
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly spending limits by category</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5 self-start">
          <Plus className="w-4 h-4" /> New budget
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => stepMonth(m, -1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold">{fmt(month)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setMonth((m) => stepMonth(m, 1))}
          disabled={month >= currentMonth()}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Wallet className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No budgets for {fmt(month)}</h3>
          <p className="text-muted-foreground text-sm mt-1">Create a budget to start tracking your spending limits.</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" /> Create budget
          </Button>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-700">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Total Budgeted</p>
                <p className="text-xl font-bold text-white tabular-nums">{format(totalBudgeted)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-rose-600">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Total Spent</p>
                <p className="text-xl font-bold text-white tabular-nums">{format(totalSpent)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Budget cards */}
          <div className="space-y-3">
            {budgets.map((b) => {
              const status = statusLabel(b.percentage);
              return (
                <Card key={b.id} className="shadow-sm">
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {b.category && (
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.category.colorHex }} />
                      )}
                      <CardTitle className="text-sm font-semibold truncate">
                        {b.category ? b.category.name : "Overall"}
                      </CardTitle>
                      <span className={`text-xs font-medium shrink-0 ${status.className}`}>{status.text}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(b)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteBudget.mutate(b.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Progress bar */}
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor(b.percentage)}`}
                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                      />
                    </div>
                    {/* Amounts row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        <span className="font-semibold text-foreground">{format(b.spent)}</span> spent
                      </span>
                      <span>{b.percentage.toFixed(0)}%</span>
                      <span>
                        {b.isOverBudget
                          ? <span className="text-red-500 font-semibold">{format(b.spent - b.amount)} over</span>
                          : <span>{format(b.remaining)} left of {format(b.amount)}</span>
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <BudgetForm open={formOpen} onClose={handleClose} month={month} editing={editing} />
    </div>
  );
}
