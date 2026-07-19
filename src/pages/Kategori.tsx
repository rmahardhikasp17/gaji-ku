import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle, Copy, DollarSign } from 'lucide-react';
import { Category } from '../services/database';
import { useKategoriByPeriode } from '../hooks/useKategoriByPeriode';
import { useTransactionsByPeriode } from '../hooks/useTransactionsByPeriode';
import { useDateFilterHelper } from '../hooks/useDateFilterHelper';
import { computeSpendingByCategory } from '../domain/transaction';
import { getBudgetStatus } from '../domain/constants';
import { formatCurrency, formatInputNumber, parseNumber } from '../utils/formatCurrency';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const COLORS = [
  { name: 'Merah',   value: '#EF4444' },
  { name: 'Biru',    value: '#3B82F6' },
  { name: 'Hijau',   value: '#10B981' },
  { name: 'Kuning',  value: '#F59E0B' },
  { name: 'Ungu',    value: '#8B5CF6' },
  { name: 'Pink',    value: '#EC4899' },
  { name: 'Orange',  value: '#F97316' },
  { name: 'Teal',    value: '#14B8A6' },
];

const Kategori: React.FC = () => {
  const {
    categories,
    loading,
    loadCategories,
    addCategory,
    updateCategory,
    deleteCategory: removeCategory,
  } = useKategoriByPeriode();
  const { transactions } = useTransactionsByPeriode();
  const { bulan, tahun, getFormattedSelection } = useDateFilterHelper();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [isCopying, setIsCopying] = useState(false); // L3
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    budgetLimit: '',
    color: '#EF4444',
  });

  // Category spending computed in-memory — no N+1 DB queries
  const categoriesWithSpending = useMemo(() =>
    categories.map(category => {
      const spent = computeSpendingByCategory(category.name, transactions);
      const percentage = category.budgetLimit ? (spent / category.budgetLimit) * 100 : 0;
      return {
        ...category,
        spent,
        percentage: Math.min(percentage, 100),
      };
    }),
    [categories, transactions],
  );

  const totalBudget = useMemo(
    () => categories.filter(c => c.type === 'expense' && c.budgetLimit)
      .reduce((s, c) => s + (c.budgetLimit ?? 0), 0),
    [categories],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) { toast.error('Nama kategori tidak boleh kosong'); return; }

    // L5 — Duplicate name check within the same period
    const isDuplicate = categories.some(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCategory?.id
    );
    if (isDuplicate) {
      toast.error(`Kategori "${trimmedName}" sudah ada untuk bulan ini`);
      return;
    }

    // C5 — Budget limit must be positive if entered
    const budgetVal = formData.type === 'expense' && formData.budgetLimit
      ? parseNumber(formData.budgetLimit) : 0;
    if (formData.type === 'expense' && formData.budgetLimit && budgetVal <= 0) {
      toast.error('Batas anggaran harus lebih dari Rp 0');
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        type: formData.type,
        color: formData.color,
        budgetLimit: budgetVal > 0 ? budgetVal : undefined,
      };
      if (editingCategory) {
        await updateCategory(editingCategory.id!, payload);
      } else {
        await addCategory(payload);
      }
      resetForm();
    } catch { /* toast already shown in hook */ }
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'expense', budgetLimit: '', color: '#EF4444' });
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      type: cat.type,
      budgetLimit: cat.budgetLimit ? cat.budgetLimit.toString() : '',
      color: cat.color,
    });
    setShowForm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget?.id) return;
    await removeCategory(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleCopyLastMonth = async () => {
    setConfirmCopy(false);
    setIsCopying(true); // L3 — prevent double-click
    const prevMonthNum = bulan === 1 ? 12 : bulan - 1;
    const prevYearNum  = bulan === 1 ? tahun - 1 : tahun;
    try {
      const { db } = await import('../services/database');
      const prevCategories = await db.categories
        .where(['bulan', 'tahun'])
        .equals([prevMonthNum, prevYearNum])
        .toArray();

      if (prevCategories.length === 0) {
        toast.error('Tidak ada kategori dari bulan sebelumnya');
        return;
      }

      const newCategories = prevCategories.map(({ id: _id, bulan: _b, tahun: _t, createdAt: _c, ...rest }) => ({
        ...rest,
        bulan,
        tahun,
        createdAt: new Date(),
      }));
      await db.categories.bulkAdd(newCategories);
      await loadCategories();
      toast.success(`${newCategories.length} kategori berhasil disalin dari bulan sebelumnya`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyalin kategori');
    } finally {
      setIsCopying(false); // L3
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-56" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-gray-200 rounded w-36" />
            <div className="h-9 bg-gray-200 rounded w-36" />
          </div>
        </div>
        {/* Category section skeletons */}
        {['Pengeluaran', 'Pemasukan'].map(s => (
          <div key={s} className="bg-white rounded-xl shadow-sm">
            <div className="p-4 sm:p-6 border-b">
              <div className="h-5 bg-gray-200 rounded w-40" />
            </div>
            <div className="divide-y divide-gray-100">
              {[0,1,2].map(i => (
                <div key={i} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                    <div className="h-4 bg-gray-200 rounded w-32" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-4 bg-gray-100 rounded w-20" />
                    <div className="h-4 bg-gray-100 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const incomeCategories  = categoriesWithSpending.filter(c => c.type === 'income');
  const expenseCategories = categoriesWithSpending.filter(c => c.type === 'expense');

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
          <p className="text-gray-600 mt-1">Kelola kategori untuk {getFormattedSelection()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmCopy(true)}
            disabled={isCopying}
            className="flex items-center gap-2"
          >
            {isCopying
              ? <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Menyalin...</>
              : <><Copy className="h-4 w-4" /> Salin Bulan Lalu</>
            }
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Tambah Kategori
          </Button>
        </div>
      </div>

      {/* Budget Summary */}
      {totalBudget > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-800">Total Anggaran Bulanan:</span>
          </div>
          <span className="text-lg font-bold text-blue-900">{formatCurrency(totalBudget)}</span>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cat-name">Nama Kategori</Label>
                <Input id="cat-name" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Contoh: Makan Siang" required />
              </div>
              <div>
                <Label>Tipe</Label>
                <Select value={formData.type} onValueChange={(v: 'income' | 'expense') => setFormData(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Pemasukan</SelectItem>
                    <SelectItem value="expense">Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type === 'expense' && (
                <div>
                  <Label htmlFor="cat-budget">Batas Anggaran (Opsional)</Label>
                  <Input id="cat-budget" value={formData.budgetLimit}
                    onChange={e => setFormData(p => ({ ...p, budgetLimit: formatInputNumber(e.target.value) }))}
                    placeholder="0" />
                </div>
              )}
              <div>
                <Label>Warna</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c.value} type="button" title={c.name}
                      onClick={() => setFormData(p => ({ ...p, color: c.value }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
            </div>
          </form>
        </div>
      )}

      {/* Category Tables — responsive card layout on mobile */}
      {[
        { title: 'Pengeluaran', items: expenseCategories, color: 'red'   },
        { title: 'Pemasukan',   items: incomeCategories,  color: 'emerald'},
      ].map(({ title, items, color }) => (
        <div key={title} className="bg-white rounded-xl shadow-sm">
          <div className="p-4 sm:p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Kategori {title}</h2>
              {items.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {items.length}
                </span>
              )}
            </div>
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                color === 'red' ? 'bg-red-50' : 'bg-emerald-50'
              }`}>
                <DollarSign className={`h-6 w-6 ${
                  color === 'red' ? 'text-red-400' : 'text-emerald-400'
                }`} />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Belum ada kategori {title.toLowerCase()}</p>
              <p className="text-xs text-gray-400 mb-4">
                {color === 'red'
                  ? 'Tambahkan kategori untuk melacak pengeluaran & anggaran Anda'
                  : 'Tambahkan kategori untuk mencatat sumber pemasukan Anda'}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setFormData(p => ({ ...p, type: color === 'red' ? 'expense' : 'income' }));
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Tambah Kategori {title}
              </Button>
            </div>
          ) : (
            <>
              {/* Unified Card Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 bg-gray-50/30">
                {items.map(cat => {
                  const status = getBudgetStatus(cat.percentage);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'auto' });
                        handleEdit(cat);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setDeleteTarget(cat);
                      }}
                      className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm card-interactive transition-all duration-200 cursor-pointer relative group flex flex-col justify-between overflow-hidden"
                      title="Tap untuk Edit, Tahan/Kanan untuk Hapus"
                    >
                      {/* Top section: Name and Budget Status badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <h3 className="font-semibold text-gray-900 truncate text-base">{cat.name}</h3>
                        </div>
                        {/* Hidden action buttons show on hover (desktop) */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1 bg-white/80 rounded-lg px-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(cat); }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Middle section: Budget Progress if Expense */}
                      {title === 'Pengeluaran' && cat.budgetLimit > 0 ? (
                        <div className="mt-auto space-y-2 relative z-10">
                          <div className="flex justify-between items-end gap-2 px-0.5">
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Terpakai</p>
                              <p className="font-medium text-gray-900 text-sm leading-none">{formatCurrency(cat.spent)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Batas</p>
                              <p className="font-medium text-gray-500 text-sm leading-none">{formatCurrency(cat.budgetLimit)}</p>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                cat.percentage >= 100 ? 'bg-red-500' : cat.percentage >= 80 ? 'bg-orange-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center px-0.5">
                            <p className={`text-[10px] font-medium max-w-[70%] truncate ${cat.percentage >= 80 ? status.color : 'text-gray-400'}`}>
                              {cat.percentage >= 80 ? `⚠️ ${status.text}` : `${Math.floor(100 - cat.percentage)}% Tersisa`}
                            </p>
                            <p className={`text-xs font-bold leading-none ${status.color}`}>
                              {cat.percentage.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      ) : (
                         /* Income / No budget fallback spacing */
                        <div className="mt-8"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ))}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus kategori <strong>"{deleteTarget?.name}"</strong>? Transaksi yang sudah menggunakan kategori ini tidak akan terhapus, tetapi tidak akan tergabung ke kategori manapun.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy from Last Month Confirmation */}
      <AlertDialog open={confirmCopy} onOpenChange={setConfirmCopy}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salin Kategori Bulan Lalu?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori dari bulan sebelumnya akan disalin ke {getFormattedSelection()}. Kategori yang sudah ada tidak akan ditimpa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyLastMonth}>Ya, Salin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Kategori;
