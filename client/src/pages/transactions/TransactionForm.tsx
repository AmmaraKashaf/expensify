import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategories } from "@/hooks/useCategories";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/useTransactions";
import type { Transaction } from "@/types";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  categoryId: z.string().uuid("Select a category"),
  description: z.string().optional(),
  merchantName: z.string().optional(),
  date: z.string(),
  paymentMethod: z.enum(["cash", "card", "upi", "bank_transfer", "other"]),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
}

export function TransactionForm({ open, onClose, transaction }: Props) {
  const { data: categories = [] } = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      paymentMethod: "other",
      date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        categoryId: transaction.categoryId,
        description: transaction.description || "",
        merchantName: transaction.merchantName || "",
        date: transaction.date.split("T")[0],
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes || "",
      });
    } else {
      reset({ type: "expense", paymentMethod: "other", date: new Date().toISOString().split("T")[0] });
    }
  }, [transaction, reset]);

  async function onSubmit(data: FormData) {
    try {
      setSubmitError(null);
      if (transaction) {
        await update.mutateAsync({ id: transaction.id, ...data });
      } else {
        await create.mutateAsync(data);
      }
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: unknown } }; message?: string };
      const raw = e?.response?.data?.error;
      const msg = typeof raw === "string" ? raw : e?.message ?? "Failed to save transaction";
      setSubmitError(msg);
    }
  }

  const type = watch("type");
  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("type", t)}
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  type === t
                    ? t === "income"
                      ? "bg-emerald-500 text-white"
                      : "bg-red-500 text-white"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" {...register("date")} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Category</Label>
            <Select onValueChange={(v) => setValue("categoryId", v)} defaultValue={transaction?.categoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: cat.colorHex }}
                      />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Description / Merchant</Label>
            <Input placeholder="e.g. Starbucks, Netflix" {...register("merchantName")} />
          </div>

          <div className="space-y-1">
            <Label>Payment method</Label>
            <Select onValueChange={(v) => setValue("paymentMethod", v as FormData["paymentMethod"])} defaultValue="other">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["cash", "card", "upi", "bank_transfer", "other"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Any additional notes..." rows={2} {...register("notes")} />
          </div>

          {submitError && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{submitError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {transaction ? "Save changes" : "Add transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
