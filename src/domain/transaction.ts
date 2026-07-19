// Pure transaction domain functions — zero React, zero side-effects.
// All inputs come from already-loaded data; no DB calls here.

import { Transaction } from '../services/database';

export interface Totals {
  income: number;
  expense: number;
  balance: number;
}

export interface DailyData {
  date: string;
  income: number;
  expense: number;
}

/** Sum income, expense, and balance for a set of transactions. */
export const computeTotals = (transactions: Transaction[]): Totals => {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income')  income  += t.amount;
    if (t.type === 'expense') expense += t.amount;
  }
  return { income, expense, balance: income - expense };
};

/** Sum spending for one category in a set of transactions. */
export const computeSpendingByCategory = (
  categoryName: string,
  transactions: Transaction[],
): number =>
  transactions
    .filter(t => t.category === categoryName && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

/**
 * Generate daily income/expense data for a period.
 * - Current month → last 7 days up to today
 * - Past month    → last 7 days of that month
 * Fixes the bug where the chart always showed today's week for historical periods.
 */
export const generatePeriodDailyData = (
  transactions: Transaction[],
  bulan: number,
  tahun: number,
): DailyData[] => {
  const now = new Date();
  const isCurrentMonth = bulan === now.getMonth() + 1 && tahun === now.getFullYear();
  const lastDayOfMonth = new Date(tahun, bulan, 0).getDate();
  const endDay = isCurrentMonth ? now.getDate() : lastDayOfMonth;
  const startDay = Math.max(1, endDay - 6);

  const result: DailyData[] = [];
  for (let day = startDay; day <= endDay; day++) {
    const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTx = transactions.filter(t => t.date === dateStr);
    result.push({
      date: new Date(tahun, bulan - 1, day).toLocaleDateString('id-ID', {
        month: 'short',
        day: 'numeric',
      }),
      income:  dayTx.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0),
      expense: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    });
  }
  return result;
};
