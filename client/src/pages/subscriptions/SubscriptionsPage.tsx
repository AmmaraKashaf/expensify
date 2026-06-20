import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CreditCard, Pencil, Trash2, Loader2, CalendarClock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCategories";
import {
  useSubscriptions, useCreateSubscription, useUpdateSubscription, useDeleteSubscription,
  type SubscriptionEntry,
} from "@/hooks/useSubscriptions";
import { useCurrency } from "@/lib/utils";
import type { Category } from "@/types";

const CYCLES = [
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly",    label: "Yearly" },
] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().uuid("Select a category"),
  amount: z.coerce.number().positive("Enter a positive amount"),
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]),
  nextBillingDate: z.string().min(1, "Select a date"),
  reminderDaysBefore: z.coerce.number().int().min(0).max(30).default(3),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function urgencyStyle(days: number): { badge: string; dot: string } {
  if (days <= 3)  return { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",       dot: "bg-red-500" };
  if (days <= 7)  return { badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-500" };
  if (days <= 14) return { badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-400" };
  return { badge: "bg-muted text-muted-foreground", dot: "bg-emerald-500" };
}

function dueLabelText(days: number): string {
  if (days < 0)   return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

function cycleLabel(cycle: string): string {
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
}

interface SubFormProps {
  open: boolean;
  onClose: () => void;
  editing?: SubscriptionEntry;
  categories: Category[];
}

function SubForm({ open, onClose, editing, categories }: SubFormProps) {
  const create = useCreateSubscription();
  const update = useUpdateSubscription();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editing?.name ?? "",
      categoryId: editing?.category?.id ?? undefined,
      amount: editing?.amount,
      billingCycle: editing?.billingCycle ?? "monthly",
      nextBillingDate: editing?.nextBillingDate
        ? new Date(editing.nextBillingDate).toISOString().split("T")[0]
        : "",
      reminderDaysBefore: editing?.reminderDaysBefore ?? 3,
      notes: editing?.notes ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...data });
    } else {
      await create.mutateAsync(data);
    }
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit subscription" : "New subscription"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input placeholder="e.g. Netflix, Spotify, iCloud" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Billing cycle</Label>
              <Select
                defaultValue={editing?.billingCycle ?? "monthly"}
                onValueChange={(v) => setValue("billingCycle", v as FormData["billingCycle"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CYCLES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              defaultValue={editing?.category?.id}
              onValueChange={(v) => setValue("categoryId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={categories.length === 0 ? "Loading…" : "Select category"} />
              </SelectTrigger>
              <SelectContent>
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
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Next billing date</Label>
              <Input type="date" {...register("nextBillingDate")} />
              {errors.nextBillingDate && <p className="text-xs text-destructive">{errors.nextBillingDate.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Remind me (days before)</Label>
              <Input type="number" min={0} max={30} {...register("reminderDaysBefore")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Any notes..." rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save changes" : "Add subscription"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SubscriptionsPage() {
  const { data, isLoading } = useSubscriptions();
  // Fetched at page level so it's ready before the dialog opens
  const { data: categories = [] } = useCategories();
  const deleteSubscription = useDeleteSubscription();
  const { format } = useCurrency();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionEntry | undefined>();

  const subscriptions = data?.subscriptions ?? [];
  const totalMonthly = data?.totalMonthly ?? 0;

  function handleEdit(s: SubscriptionEntry) { setEditing(s); setFormOpen(true); }
  function handleClose() { setEditing(undefined); setFormOpen(false); }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your recurring services and bills</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5 self-start">
          <Plus className="w-4 h-4" /> Add subscription
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <CreditCard className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No subscriptions yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Add Netflix, Spotify, or any recurring bill to track renewals.</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" /> Add subscription
          </Button>
        </div>
      ) : (
        <>
          {/* Monthly cost summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 to-violet-700 col-span-2 sm:col-span-1">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Monthly cost</p>
                <p className="text-xl font-bold text-white tabular-nums">{format(totalMonthly)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Yearly cost</p>
                <p className="text-lg font-bold tabular-nums">{format(totalMonthly * 12)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Active</p>
                <p className="text-lg font-bold">{subscriptions.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Subscription list */}
          <div className="space-y-3">
            <AnimatePresence>
              {subscriptions.map((s, i) => {
                const style = urgencyStyle(s.daysUntil);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="shadow-sm">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (s.category?.colorHex ?? "#6B7280") + "20" }}
                        >
                          <CreditCard className="w-5 h-5" style={{ color: s.category?.colorHex ?? "#6B7280" }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold truncate">{s.name}</p>
                            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                              {cycleLabel(s.billingCycle)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {s.category && (
                              <span className="text-xs text-muted-foreground">{s.category.name}</span>
                            )}
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${style.badge}`}>
                              <CalendarClock className="w-3 h-3" />
                              {dueLabelText(s.daysUntil)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums">{format(s.amount)}</p>
                          {s.billingCycle !== "monthly" && (
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {format(s.monthlyEquivalent)}/mo
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(s)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteSubscription.mutate(s.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      <SubForm open={formOpen} onClose={handleClose} editing={editing} categories={categories} />
    </div>
  );
}
