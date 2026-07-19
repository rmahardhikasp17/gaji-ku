import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Category, Transaction, db } from '../services/database';
import { useKategoriByPeriode } from '../hooks/useKategoriByPeriode';
import { useTargets } from '../hooks/useTargets';
import { useDateFilter } from '../store/useDateFilter';
import { toast } from 'sonner';
import { formatInputNumber, parseNumber } from '../utils/formatCurrency';


interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionSaved: () => void;
  editingTransaction?: Transaction | null;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onTransactionSaved,
  editingTransaction
}) => {
  const navigate = useNavigate();
  const { bulan, tahun } = useDateFilter();
  const { categories, loading: categoriesLoading } = useKategoriByPeriode();
  const { activeTargetProgress, loading: targetsLoading } = useTargets();
  const activeTargets = activeTargetProgress.map(tp => tp.target);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: '' as 'income' | 'expense' | 'transfer_to_target' | '',
    amount: '',
    description: '',
    category: '',
    targetId: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Reset form when modal opens/closes or when editing transaction changes
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setFormData({
          type: editingTransaction.type,
          amount: formatInputNumber(editingTransaction.amount.toString()),
          description: editingTransaction.description,
          category: editingTransaction.category,
          targetId: editingTransaction.targetId?.toString() || '',
          date: editingTransaction.date
        });
      } else {
        setFormData({
          type: '',
          amount: '',
          description: '',
          category: '',
          targetId: '',
          date: new Date().toISOString().split('T')[0]
        });
      }
    }
  }, [isOpen, editingTransaction]);

  // Memoized filtered categories to prevent re-renders and duplicates
  const filteredCategories = useMemo(() => {
    if (!formData.type || formData.type === 'transfer_to_target') return [];
    
    const filtered = categories.filter(cat => cat.type === formData.type);
    // Remove duplicates by creating a Map with unique names
    const uniqueCategories = Array.from(
      new Map(filtered.map(cat => [cat.name, cat])).values()
    );
    return uniqueCategories;
  }, [categories, formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.type === 'transfer_to_target') {
      if (!formData.amount || !formData.description || !formData.targetId) {
        toast.error('Semua field harus diisi untuk setor ke target');
        return;
      }
    } else {
      if (!formData.amount || !formData.description || !formData.category) {
        toast.error('Semua field harus diisi');
        return;
      }
    }

    const amount = parseNumber(formData.amount);
    if (amount <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }

    setIsLoading(true);
    try {
      const transactionData: any = {
        type: formData.type,
        amount: amount,
        description: formData.description,
        date: formData.date,
        createdAt: editingTransaction?.createdAt || new Date()
      };

      // Add category or targetId based on transaction type
      if (formData.type === 'transfer_to_target') {
        transactionData.targetId = parseInt(formData.targetId);
        transactionData.category = 'Transfer ke Target';
      } else {
        transactionData.category = formData.category;
      }

      if (editingTransaction) {
        await db.transactions.update(editingTransaction.id!, transactionData);
        toast.success('Transaksi berhasil diupdate');
      } else {
        await db.transactions.add(transactionData);
        toast.success('Transaksi berhasil ditambahkan');
      }

      onTransactionSaved();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Gagal menyimpan transaksi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (newType: 'income' | 'expense' | 'transfer_to_target') => {
    setFormData({ 
      ...formData, 
      type: newType, 
      category: '', 
      targetId: '' 
    });
  };

  const isFormValid = () => {
    if (formData.type === 'transfer_to_target') {
      return formData.amount && formData.description && formData.targetId;
    }
    return formData.amount && formData.description && formData.category && formData.type;
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999] p-4"
      style={{ touchAction: 'none' }}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-md flex flex-col relative"
        style={{
          maxHeight: 'calc(100dvh - 2rem)',
          height: 'fit-content',
          touchAction: 'auto'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mr-4">
            {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            maxHeight: 'calc(100dvh - 8rem)',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <form
            id="transaction-form"
            onSubmit={handleSubmit}
            className="p-4 sm:p-6 space-y-4 sm:space-y-5"
          >
            {/* 1. Amount (Nominal) - Prominently at the top */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1text-center">
                Nominal
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium sm:text-lg">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.amount}
                  onChange={(e) => {
                    const formatted = formatInputNumber(e.target.value);
                    setFormData({ ...formData, amount: formatted });
                  }}
                  className="w-full pl-12 pr-4 py-4 text-2xl sm:text-3xl font-bold text-gray-900 border-0 border-b-2 border-gray-200 focus:ring-0 focus:border-emerald-500 bg-gray-50 rounded-t-xl transition-colors"
                  placeholder="0"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 2. Transaction Type - Segmented Control */}
            <div>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    formData.type === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    formData.type === 'income' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('transfer_to_target')}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    formData.type === 'transfer_to_target' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Ke Target
                </button>
              </div>
            </div>

            {/* 2. Category/Target Selection - Only shows after type is selected */}
            {formData.type && (
              formData.type === 'transfer_to_target' ? (
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Pilih Target Tabungan
                  </label>
                  <div className="space-y-3">
                    <select
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                      className="w-full px-3 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isLoading}
                    >
                      <option value="">Pilih target tabungan</option>
                      {activeTargets.map((target, index) => (
                        <option key={`target-${target.id}-${index}`} value={target.id}>
                          {target.nama} (Target: {formatInputNumber(target.nominalTarget.toString())})
                        </option>
                      ))}
                    </select>
                    
                    {activeTargets.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs sm:text-sm font-medium text-blue-600 mb-2">
                          Target Aktif:
                        </div>
                        <div className="space-y-1">
                          {activeTargets.map((target, index) => (
                            <div key={`active-target-${target.id}-${index}`} className="text-xs sm:text-sm text-blue-700">
                              🎯 <span className="break-words whitespace-normal">{target.nama}</span> - 
                              Target: {formatInputNumber(target.nominalTarget.toString())}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {activeTargets.length === 0 && !targetsLoading && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="text-xs sm:text-sm text-yellow-700 break-words whitespace-normal">
                          Tidak ada target aktif untuk periode ini. Silakan buat target di halaman Target.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <div className="space-y-3">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      required
                      disabled={isLoading}
                    >
                      <option value="">
                        {formData.type === 'income' ? 'Pilih kategori pemasukan' : 'Pilih kategori pengeluaran'}
                      </option>
                      {filteredCategories.map((category, index) => (
                        <option key={`category-${category.id}-${index}`} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    {/* C1 — Empty category guidance */}
                    {filteredCategories.length === 0 && !categoriesLoading && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-700">
                          Belum ada kategori {formData.type === 'income' ? 'pemasukan' : 'pengeluaran'} untuk bulan ini.
                        </p>
                        <button
                          type="button"
                          onClick={() => { onClose(); navigate('/kategori'); }}
                          className="text-sm font-medium text-amber-800 underline mt-1"
                        >
                          Buat kategori sekarang →
                        </button>
                      </div>
                    )}

                    {filteredCategories.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs sm:text-sm font-medium text-gray-600 mb-2">
                          {formData.type === 'income' ? 'Kategori Pemasukan:' : 'Kategori Pengeluaran:'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {filteredCategories.map((category, index) => (
                            <span
                              key={`category-badge-${category.id}-${index}`}
                              className={`inline-flex items-center px-2 py-1 rounded-full font-medium break-words ${
                                formData.type === 'income'
                                  ? 'bg-emerald-100 text-emerald-800 text-xs leading-tight'
                                  : 'bg-red-100 text-red-800 text-xs leading-tight'
                              }`}
                              title={category.name}
                            >
                              <span className="break-words max-w-20 leading-tight">
                                {category.name.length > 15 ? `${category.name.substring(0, 15)}...` : category.name}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Description & Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 transition-colors"
                  placeholder="Cth: Makan Siang"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* L6 — Date-period mismatch warning */}
            {(() => {
              const txDate = new Date(formData.date);
              const txMonth = txDate.getMonth() + 1;
              const txYear  = txDate.getFullYear();
              const mismatch = formData.date && (txMonth !== bulan || txYear !== tahun);
              return mismatch ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    ⚠️ Tanggal transaksi berbeda dengan periode yang sedang dilihat ({String(bulan).padStart(2,'0')}/{tahun}).
                    Transaksi akan tersimpan di bulan/tahun sesuai tanggal yang dipilih.
                  </p>
                </div>
              ) : null;
            })()}



            {/* Form Buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid() || isLoading}
                className="w-full bg-emerald-500 text-white py-3.5 px-4 rounded-xl hover:bg-emerald-600 transition-colors duration-200 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                {isLoading ? 'Menyimpan...' : editingTransaction ? 'Simpan Perubahan' : 'Catat Transaksi'}
              </button>

              {editingTransaction && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    const ok = window.confirm('Hapus transaksi ini permanen?');
                    if (!ok) return;
                    setIsLoading(true);
                    try {
                      await db.transactions.delete(editingTransaction.id!);
                      toast.success('Transaksi dihapus');
                      onTransactionSaved();
                      onClose();
                    } catch (e) {
                      toast.error('Gagal menghapus');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="w-full mt-3 py-3 px-4 text-red-500 hover:text-red-700 hover:bg-red-50 font-medium text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  Hapus Transaksi
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransactionFormModal;
