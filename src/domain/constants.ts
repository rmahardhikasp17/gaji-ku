// Single source of truth for all shared constants and pure lookup functions.
// Import from here — never hardcode month names or status mappings in components.

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

export const getMonthName = (month: number): string => MONTH_NAMES[month - 1] ?? '';

export const formatPeriod = (bulan: number, tahun: number): string =>
  `${getMonthName(bulan)} ${tahun}`;

// ─── Budget status ───────────────────────────────────────────────────────────

export interface BudgetStatus {
  color: string;    // Tailwind text-* class
  text: string;     // human-readable status
}

export const getBudgetStatus = (percentage: number): BudgetStatus => {
  if (percentage >= 100) return { color: 'text-red-600',     text: 'Melebihi Batas' };
  if (percentage >= 80)  return { color: 'text-orange-600',  text: 'Mendekati Batas' };
  return                        { color: 'text-emerald-600', text: 'Dalam Batas' };
};

// ─── Target status ───────────────────────────────────────────────────────────

export type TargetStatusKey = 'completed' | 'ahead' | 'behind' | 'on-track';

export const TARGET_STATUS_MAP: Record<TargetStatusKey, { color: string; text: string }> = {
  completed:  { color: 'text-green-600 bg-green-100', text: 'Tercapai' },
  ahead:      { color: 'text-blue-600 bg-blue-100',   text: 'Lebih Cepat' },
  behind:     { color: 'text-red-600 bg-red-100',     text: 'Tertinggal' },
  'on-track': { color: 'text-gray-600 bg-gray-100',   text: 'Sesuai Target' },
};

export const getTargetStatus = (status: TargetStatusKey) =>
  TARGET_STATUS_MAP[status] ?? TARGET_STATUS_MAP['on-track'];
