import { Target, Transaction } from '../services/database';

export interface TargetProgress {
  target: Target;
  progress: number;
  percentage: number;
  remainingAmount: number;
  remainingMonths: number;
  monthlyTarget: number;
  status: 'on-track' | 'behind' | 'ahead' | 'completed';
}

export const isTargetActive = (target: Target, year: number, month: number): boolean => {
  const start = new Date(target.tahunMulai, target.bulanMulai - 1, 1);
  const end   = new Date(target.tahunSelesai, target.bulanSelesai - 1, 31);
  const curr  = new Date(year, month - 1, 1);
  return curr >= start && curr <= end;
};

export const computeTargetProgress = (
  target: Target,
  allTransactions: Transaction[],
): TargetProgress => {
  const targetTx = allTransactions.filter(
    t => t.type === 'transfer_to_target' && t.targetId === target.id,
  );
  const totalSaved      = targetTx.reduce((sum, t) => sum + t.amount, 0);
  const progress        = Math.min(totalSaved, target.nominalTarget);
  const percentage      = (progress / target.nominalTarget) * 100;
  const remainingAmount = Math.max(0, target.nominalTarget - progress);

  const now    = new Date();
  const end    = new Date(target.tahunSelesai, target.bulanSelesai - 1, 31);
  const diffMs = end.getTime() - now.getTime();
  const remainingMonths = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));

  const totalMonths =
    (target.tahunSelesai - target.tahunMulai) * 12 +
    (target.bulanSelesai - target.bulanMulai) + 1;
  const monthlyTarget = target.nominalTarget / totalMonths;

  let status: TargetProgress['status'] = 'on-track';
  if (percentage >= 100) {
    status = 'completed';
  } else if (remainingMonths > 0) {
    const expectedPct = (1 - remainingMonths / totalMonths) * 100;
    if (percentage < expectedPct - 10) status = 'behind';
    else if (percentage > expectedPct + 10) status = 'ahead';
  }

  return {
    target,
    progress,
    percentage: Math.min(percentage, 100),
    remainingAmount,
    remainingMonths,
    monthlyTarget,
    status,
  };
};
