import { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, Transaction, db } from '../services/database';
import { computeTargetProgress, TargetProgress, isTargetActive } from '../domain/target';
import { toast } from '@/hooks/use-toast';

/**
 * Single hook for all target-related state.
 * Replaces the 3 overlapping hooks: useTarget + useActiveTargets + useTargetProgress.
 *
 * Fixes:
 * - N+1 queries → 2 parallel queries (targets + transfer transactions)
 * - Stale progress → useMemo recomputes automatically when data changes
 * - Duplicate "active" filtering logic unified here
 * - Adds missing updateTarget (edit) capability
 */
export const useTargets = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetTransactions, setTargetTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [targetsData, txData] = await Promise.all([
        db.targets.orderBy('createdAt').reverse().toArray(),
        db.transactions.where('type').equals('transfer_to_target').toArray(),
      ]);
      setTargets(targetsData);
      setTargetTransactions(txData);
    } catch (err) {
      console.error('Error loading targets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Progress for every target — computed in-memory, no DB calls. */
  const targetProgress = useMemo(
    (): TargetProgress[] => targets.map(t => computeTargetProgress(t, targetTransactions)),
    [targets, targetTransactions],
  );

  /** Progress for targets currently active (start ≤ today ≤ end). */
  const activeTargetProgress = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return targetProgress.filter(tp => isTargetActive(tp.target, year, month));
  }, [targetProgress]);

  const addTarget = useCallback(async (data: Omit<Target, 'id' | 'createdAt'>) => {
    try {
      await db.targets.add({ ...data, createdAt: new Date() });
      await loadData();
      toast({ title: 'Berhasil', description: 'Target tabungan berhasil ditambahkan' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menambah target', variant: 'destructive' });
      throw new Error('add failed');
    }
  }, [loadData]);

  const updateTarget = useCallback(async (id: number, data: Partial<Target>) => {
    try {
      await db.targets.update(id, data);
      await loadData();
      toast({ title: 'Berhasil', description: 'Target berhasil diperbarui' });
    } catch {
      toast({ title: 'Error', description: 'Gagal memperbarui target', variant: 'destructive' });
      throw new Error('update failed');
    }
  }, [loadData]);

  const deleteTarget = useCallback(async (id: number) => {
    try {
      await db.targets.delete(id);
      await loadData();
      toast({ title: 'Berhasil', description: 'Target berhasil dihapus' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus target', variant: 'destructive' });
      throw new Error('delete failed');
    }
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  return {
    targets,
    targetProgress,
    activeTargetProgress,
    loading,
    loadData,
    addTarget,
    updateTarget,
    deleteTarget,
  };
};
