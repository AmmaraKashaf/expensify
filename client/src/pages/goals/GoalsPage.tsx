import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Target, Pencil, Trash2, Loader2, PiggyBank, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useAddContribution,
  type GoalEntry,
} from "@/hooks/useGoals";
import { useCurrency } from "@/lib/utils";

const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#F97316"];

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().positive("Enter a positive amount"),
  deadline: z.string().optional(),
  colorHex: z.string().default("#10B981"),
});
type GoalForm = z.infer<typeof goalSchema>;

const contribSchema = z.object({
  amount: z.coerce.number().positive("Enter a positive amount"),
  date: z.string().optional(),
});
type ContribForm = z.infer<typeof contribSchema>;

// Circular SVG progress ring
function ProgressRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
  editing?: GoalEntry;
}

function GoalFormDialog({ open, onClose, editing }: GoalFormDialogProps) {
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: editing?.name ?? "",
      targetAmount: editing?.targetAmount,
      deadline: editing?.deadline ? editing.deadline.split("T")[0] : undefined,
      colorHex: editing?.colorHex ?? "#10B981",
    },
  });

  const selectedColor = watch("colorHex");

  async function onSubmit(data: GoalForm) {
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...data, deadline: data.deadline || null });
    } else {
      await create.mutateAsync({ ...data, deadline: data.deadline || null });
    }
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit goal" : "New savings goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label>Goal name</Label>
            <Input placeholder="e.g. Buy a car, Emergency fund" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Target amount</Label>
            <Input type="number" step="0.01" placeholder="0.00" {...register("targetAmount")} />
            {errors.targetAmount && <p className="text-xs text-destructive">{errors.targetAmount.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Deadline (optional)</Label>
            <Input type="date" {...register("deadline")} />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("colorHex", c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: selectedColor === c ? `3px solid ${c}` : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save changes" : "Create goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ContribDialogProps {
  open: boolean;
  onClose: () => void;
  goal: GoalEntry;
}

function ContribDialog({ open, onClose, goal }: ContribDialogProps) {
  const add = useAddContribution();
  const { format } = useCurrency();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContribForm>({
    resolver: zodResolver(contribSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0] },
  });

  async function onSubmit(data: ContribForm) {
    await add.mutateAsync({ goalId: goal.id, amount: data.amount, date: data.date });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add contribution</DialogTitle>
        </DialogHeader>
        <div className="py-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{goal.name}</span> — {format(goal.remaining)} remaining
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} autoFocus />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={add.isPending}>
              {add.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();
  const { format } = useCurrency();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalEntry | undefined>();
  const [contributing, setContributing] = useState<GoalEntry | undefined>();

  const active = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);

  function handleEdit(g: GoalEntry) { setEditing(g); setFormOpen(true); }
  function handleFormClose() { setEditing(undefined); setFormOpen(false); }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Savings Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track progress toward your financial targets</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5 self-start">
          <Plus className="w-4 h-4" /> New goal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <PiggyBank className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No goals yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Set a savings target and track your progress.</p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" /> Create goal
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active goals */}
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">In progress</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {active.map((g, i) => (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="shadow-sm h-full">
                        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                          <CardTitle className="text-sm font-semibold leading-tight">{g.name}</CardTitle>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(g)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteGoal.mutate(g.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Ring + amounts */}
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <ProgressRing pct={g.percentage} color={g.colorHex} size={80} />
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                                {g.percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Saved</p>
                              <p className="text-lg font-bold tabular-nums" style={{ color: g.colorHex }}>
                                {format(g.currentAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                of <span className="font-medium text-foreground">{format(g.targetAmount)}</span>
                              </p>
                            </div>
                          </div>

                          {/* Deadline */}
                          {g.daysLeft !== null && (
                            <p className={`text-xs ${g.daysLeft < 0 ? "text-red-500" : g.daysLeft <= 30 ? "text-orange-500" : "text-muted-foreground"}`}>
                              <Target className="w-3 h-3 inline mr-1" />
                              {g.daysLeft < 0
                                ? `${Math.abs(g.daysLeft)} days overdue`
                                : g.daysLeft === 0
                                ? "Due today"
                                : `${g.daysLeft} days left`}
                            </p>
                          )}

                          <Button
                            size="sm"
                            className="w-full h-8 text-xs"
                            style={{ backgroundColor: g.colorHex, color: "#fff" }}
                            onClick={() => setContributing(g)}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add contribution
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Completed goals */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completed.map((g) => (
                  <Card key={g.id} className="shadow-sm opacity-75">
                    <CardContent className="p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 shrink-0" style={{ color: g.colorHex }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{format(g.targetAmount)} reached</p>
                      </div>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => deleteGoal.mutate(g.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <GoalFormDialog open={formOpen} onClose={handleFormClose} editing={editing} />
      {contributing && (
        <ContribDialog open goal={contributing} onClose={() => setContributing(undefined)} />
      )}
    </div>
  );
}
