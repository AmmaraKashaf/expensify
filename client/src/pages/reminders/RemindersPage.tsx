import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Bell, Pencil, Trash2, Loader2, CheckCheck, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useReminders, useCreateReminder, useUpdateReminder,
  useMarkPaid, useUnmarkPaid, useDeleteReminder,
  type ReminderEntry,
} from "@/hooks/useReminders";
import { useCurrency } from "@/lib/utils";

const RECURRENCES = [
  { value: "once",      label: "One-time" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly",    label: "Yearly" },
] as const;

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().positive("Enter a positive amount"),
  dueDate: z.string().min(1, "Select a date"),
  recurrence: z.enum(["once", "monthly", "quarterly", "yearly"]),
});
type FormData = z.infer<typeof schema>;

function urgencyStyle(days: number, isPaid: boolean) {
  if (isPaid) return { ring: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  if (days < 0)   return { ring: "border-red-300 dark:border-red-700",    dot: "bg-red-500",    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  if (days <= 3)  return { ring: "border-red-200 dark:border-red-800",    dot: "bg-red-400",    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  if (days <= 7)  return { ring: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
  if (days <= 14) return { ring: "border-yellow-200 dark:border-yellow-800", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
  return { ring: "border-border", dot: "bg-emerald-500", badge: "bg-muted text-muted-foreground" };
}

function dueLabelText(days: number, isPaid: boolean): string {
  if (isPaid)    return "Paid";
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

function recurrenceLabel(r: string) {
  return RECURRENCES.find((x) => x.value === r)?.label ?? r;
}

interface ReminderFormProps {
  open: boolean;
  onClose: () => void;
  editing?: ReminderEntry;
}

function ReminderForm({ open, onClose, editing }: ReminderFormProps) {
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: editing?.title ?? "",
      amount: editing?.amount,
      dueDate: editing?.dueDate ? new Date(editing.dueDate).toISOString().split("T")[0] : "",
      recurrence: editing?.recurrence ?? "once",
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
          <DialogTitle>{editing ? "Edit reminder" : "New bill reminder"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input placeholder="e.g. Electricity bill, Rent" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <Input type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Recurrence</Label>
            <Select
              defaultValue={editing?.recurrence ?? "once"}
              onValueChange={(v) => setValue("recurrence", v as FormData["recurrence"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECURRENCES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save changes" : "Add reminder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemindersPage() {
  const { data: reminders = [], isLoading } = useReminders();
  const markPaid = useMarkPaid();
  const unmarkPaid = useUnmarkPaid();
  const deleteReminder = useDeleteReminder();
  const { format } = useCurrency();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReminderEntry | undefined>();

  const upcoming = reminders.filter((r) => !r.isPaid);
  const paid     = reminders.filter((r) => r.isPaid);
  const overdue  = upcoming.filter((r) => r.daysUntil < 0).length;
  const dueSoon  = upcoming.filter((r) => r.daysUntil >= 0 && r.daysUntil <= 7).length;

  function handleEdit(r: ReminderEntry) { setEditing(r); setFormOpen(true); }
  function handleClose() { setEditing(undefined); setFormOpen(false); }

  function ReminderCard({ r }: { r: ReminderEntry }) {
    const style = urgencyStyle(r.daysUntil, r.isPaid);
    return (
      <Card className={`shadow-sm border ${style.ring}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-semibold truncate ${r.isPaid ? "line-through text-muted-foreground" : ""}`}>
                {r.title}
              </p>
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 shrink-0">
                {recurrenceLabel(r.recurrence)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${style.badge}`}>
                {dueLabelText(r.daysUntil, r.isPaid)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          <p className="text-sm font-bold tabular-nums shrink-0">{format(r.amount)}</p>

          <div className="flex items-center gap-1 shrink-0">
            {r.isPaid ? (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Unmark paid" onClick={() => unmarkPaid.mutate(r.id)}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-600" title="Mark paid" onClick={() => markPaid.mutate(r.id)}>
                <CheckCheck className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteReminder.mutate(r.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bill Reminders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Never miss a payment deadline</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5 self-start">
          <Plus className="w-4 h-4" /> Add reminder
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No reminders yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Add your electricity bill, rent, or any recurring payment.</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" /> Add reminder
          </Button>
        </div>
      ) : (
        <>
          {/* Summary chips */}
          {(overdue > 0 || dueSoon > 0) && (
            <div className="flex gap-2 flex-wrap">
              {overdue > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {overdue} overdue
                </span>
              )}
              {dueSoon > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {dueSoon} due this week
                </span>
              )}
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
              <AnimatePresence>
                {upcoming.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <ReminderCard r={r} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Paid */}
          {paid.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid</h2>
              <div className="space-y-2 opacity-60">
                {paid.map((r) => <ReminderCard key={r.id} r={r} />)}
              </div>
            </div>
          )}
        </>
      )}

      <ReminderForm open={formOpen} onClose={handleClose} editing={editing} />
    </div>
  );
}
