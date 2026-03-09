import { CreditCard, TrendingUp } from "lucide-react";
import { useEarnings } from "@/hooks/useEarnings";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(!Number.isNaN(value) ? value : 0);

interface EarningsWidgetProps {
  therapistId: string | undefined;
}

export function EarningsWidget({ therapistId }: EarningsWidgetProps) {
  const { thisMonth, thisYear, loading, error } = useEarnings(therapistId);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[160px]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly Earnings</p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly Earnings</p>
        <p className="text-red-600 dark:text-red-400 text-sm mt-1">Unable to load earnings</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <CreditCard className="h-6 w-6" />
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          This month
        </span>
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly Earnings</p>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(thisMonth)}</h2>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">This year: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(thisYear)}</span></p>
    </div>
  );
}
