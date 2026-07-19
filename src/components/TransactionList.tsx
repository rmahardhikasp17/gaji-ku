import React, { useState } from 'react';
import { Edit, Trash2, Calendar, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Transaction } from '../services/database';
import { useTransactionsByPeriode } from '../hooks/useTransactionsByPeriode';
import { useDateFilterHelper } from '../hooks/useDateFilterHelper';
import { useTargets } from '../hooks/useTargets';
import { formatCurrency } from '../utils/formatCurrency';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TransactionListProps {
  onEditTransaction: (transaction: Transaction) => void;
  onAddTransaction?: () => void;
  refreshTrigger: number;
  categoryFilter?: string;
  typeFilter?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({
  onEditTransaction,
  onAddTransaction,
  refreshTrigger,
  categoryFilter = 'all',
  typeFilter = 'all'
}) => {
  const { transactions: allTransactions, loading, loadTransactions, deleteTransaction } = useTransactionsByPeriode();
  const { getFormattedSelection } = useDateFilterHelper();
  const { targets } = useTargets();
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Apply filters
  const transactions = React.useMemo(() => {
    let filtered = allTransactions;
    if (categoryFilter !== 'all') filtered = filtered.filter(t => t.category === categoryFilter);
    if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
    return filtered;
  }, [allTransactions, categoryFilter, typeFilter]);

  // Reload when refreshTrigger changes
  React.useEffect(() => {
    loadTransactions();
  }, [refreshTrigger, loadTransactions]);

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget?.id) return;
    await deleteTransaction(deleteTarget.id);
    setDeleteTarget(null);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const getTargetName = (targetId?: number) => {
    if (!targetId) return '';
    const t = targets.find(t => t.id === targetId);
    return t?.nama || `Target #${targetId}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Transaksi</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Periode: {getFormattedSelection()}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">{transactions.length} transaksi ditemukan</p>
      </div>

      <div className="p-6">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-gray-700 font-medium mb-1">Belum ada transaksi</p>
            <p className="text-gray-400 text-sm mb-5">
              Tidak ada transaksi untuk periode {getFormattedSelection()}
            </p>
            {onAddTransaction && (
              <button
                onClick={onAddTransaction}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150"
              >
                <span>+</span> Catat Transaksi
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                onClick={() => onEditTransaction(transaction)}
                onContextMenu={(e) => {
                  e.preventDefault(); // Prevent native right-click menu
                  setDeleteTarget(transaction); // Trigger delete modal on long-press
                }}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-white card-interactive transition-colors duration-100"
                title="Tap to edit, Long-press to delete"
              >
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    transaction.type === 'income'
                      ? 'bg-emerald-100 text-emerald-600'
                      : transaction.type === 'transfer_to_target'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'income' ? <TrendingUp className="h-5 w-5" />
                      : transaction.type === 'transfer_to_target' ? <Target className="h-5 w-5" />
                      : <TrendingDown className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{transaction.description}</h3>
                    <div className="flex items-center flex-wrap gap-x-2 text-sm text-gray-500">
                      {transaction.type === 'transfer_to_target' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🎯 {getTargetName(transaction.targetId)}
                        </span>
                      ) : (
                        <span className="truncate max-w-[120px]">{transaction.category}</span>
                      )}
                      <span className="text-gray-300">•</span>
                      <span className="whitespace-nowrap">{formatDate(transaction.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0 ml-2">
                  <span className={`font-semibold text-sm whitespace-nowrap ${
                    transaction.type === 'income' ? 'text-emerald-600'
                      : transaction.type === 'transfer_to_target' ? 'text-blue-600'
                      : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : transaction.type === 'transfer_to_target' ? '🎯 ' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* C2 — Delete confirmation dialog (replaces native confirm()) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi <strong>"{deleteTarget?.description}"</strong> sebesar{' '}
              <strong>{deleteTarget ? formatCurrency(deleteTarget.amount) : ''}</strong> akan dihapus
              secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteConfirmed}
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TransactionList;
