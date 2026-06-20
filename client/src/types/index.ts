export type TransactionType = "income" | "expense";
export type PaymentMethod = "cash" | "card" | "upi" | "bank_transfer" | "other";
export type ThemePreference = "light" | "dark" | "system";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  baseCurrency: string;
  themePreference: ThemePreference;
  createdAt: string;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  icon: string;
  colorHex: string;
  parentCategoryId?: string;
  isDefault: boolean;
  isActive: boolean;
  subCategories?: Category[];
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  category?: Category;
  type: TransactionType;
  amount: number;
  currency: string;
  convertedAmount: number;
  description?: string;
  merchantName?: string;
  date: string;
  paymentMethod: PaymentMethod;
  tags: string[];
  receiptUrl?: string;
  isRecurring: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string;
  category?: Category;
  month: string;
  amount: number;
  alertThreshold75: boolean;
  alertThreshold90: boolean;
  spent?: number;
  percentage?: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  autoAllocatePercent?: number;
  icon: string;
  colorHex: string;
  isCompleted: boolean;
  createdAt: string;
  progressPercent?: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  categoryBreakdown: { categoryId: string; name: string; colorHex: string; amount: number; percentage: number }[];
  incomeVsExpenseChart: { label: string; income: number; expense: number }[];
  recentTransactions: Transaction[];
}

export type PeriodFilter = "week" | "month" | "year" | "custom";

export interface DateRange {
  start: string;
  end: string;
}
