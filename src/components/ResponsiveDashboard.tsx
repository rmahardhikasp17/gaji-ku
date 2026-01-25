import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, User, Plus, TrendingUp, AlertTriangle, Car, ShoppingBag, Utensils, Briefcase, Heart, Zap, Home, Gift, ChevronDown } from 'lucide-react';
import { Transaction, Category } from '../services/database';
import { useTransactionsByPeriode } from '../hooks/useTransactionsByPeriode';
import { useKategoriByPeriode } from '../hooks/useKategoriByPeriode';
import { useDateFilterHelper } from '../hooks/useDateFilterHelper';
import { useUserSettings } from '../hooks/useUserSettings';
import { formatCurrency } from '../utils/formatCurrency';
import { useTargetProgress } from '@/hooks/useTargetProgress';
import { useTotalBudget } from '@/hooks/useTotalBudget';
import TransactionFormModal from './TransactionFormModal';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { useDateFilter } from '../store/useDateFilter';

interface DailyData {
  date: string;
  income: number;
  expense: number;
}

interface CategoryBudget {
  id: number;
  name: string;
  spent: number;
  budget: number;
  color: string;
  percentage: number;
}

const ResponsiveDashboard: React.FC = () => {
  const { transactions: allTransactions, getBalance } = useTransactionsByPeriode();
  const { categories } = useKategoriByPeriode();
  const { getFormattedSelection } = useDateFilterHelper();
  const { getActiveTargetProgress } = useTargetProgress();
  const { userSettings } = useUserSettings();
  const { totalBudget } = useTotalBudget();
  const { month, year, setMonth, setYear } = useDateFilter();

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);

  useEffect(() => {
    loadData();
  }, [refreshTrigger, allTransactions, categories]);

  const getDateRange = (data: DailyData[]): string => {
    if (data.length < 2) return '';
    const firstDate = data[0].date;
    const lastDate = data[data.length - 1].date;
    return `${firstDate} - ${lastDate}`;
  };

  const getCategoryIcon = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('bensin') || lowerCategory.includes('transport')) return Car;
    if (lowerCategory.includes('makanan') || lowerCategory.includes('kantin')) return Utensils;
    if (lowerCategory.includes('shopee') || lowerCategory.includes('belanja')) return ShoppingBag;
    if (lowerCategory.includes('kerja') || lowerCategory.includes('gaji')) return Briefcase;
    if (lowerCategory.includes('hiburan')) return Heart;
    if (lowerCategory.includes('listrik') || lowerCategory.includes('internet')) return Zap;
    if (lowerCategory.includes('rumah')) return Home;
    return Gift;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Get recent transactions (limit 5)
      const recentTrans = allTransactions.slice(0, 5);
      setRecentTransactions(recentTrans);

      // Calculate totals for current period
      const income = allTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setTotalIncome(income);
      setTotalExpense(expense);

      // Generate daily data for the last 7 days
      const last7Days = generateLast7DaysData(allTransactions);
      setDailyData(last7Days);

      // Calculate category budgets
      const budgetData = await calculateCategoryBudgets(categories, allTransactions);
      setCategoryBudgets(budgetData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateLast7DaysData = (transactions: Transaction[]): DailyData[] => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      last7Days.push({
        date: date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        income,
        expense
      });
    }
    
    return last7Days;
  };

  const calculateCategoryBudgets = async (categories: Category[], transactions: Transaction[]): Promise<CategoryBudget[]> => {
    const budgetCategories = categories.filter(cat => cat.type === 'expense' && cat.budgetLimit);
    
    return budgetCategories.map(category => {
      const spent = transactions
        .filter(t => t.category === category.name && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const percentage = category.budgetLimit ? (spent / category.budgetLimit) * 100 : 0;
      
      return {
        id: category.id!,
        name: category.name,
        spent,
        budget: category.budgetLimit || 0,
        color: category.color,
        percentage: Math.min(percentage, 100)
      };
    });
  };

  const handleTransactionSaved = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success('Transaksi berhasil ditambahkan!');
  };

  const getBudgetStatus = (percentage: number) => {
    if (percentage > 100) return { color: 'text-red-600', bg: 'bg-red-500', status: 'Melebihi batas!' };
    if (percentage === 100) return { color: 'text-orange-600', bg: 'bg-orange-500', status: 'Mencapai batas' };
    if (percentage >= 80) return { color: 'text-orange-600', bg: 'bg-orange-500', status: 'Mendekati batas' };
    return { color: 'text-emerald-600', bg: 'bg-emerald-500', status: 'Dalam batas' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      {/* Premium Gradient Header with Curved Bottom */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 pt-8 pb-28 px-4 sm:px-6 rounded-b-[40px] relative">
        <div className="max-w-4xl mx-auto">
          {/* Header Top - Title and Profile */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">NEKAT DIGITAL - GAJIKU</h1>
            </div>
            <div className="bg-white/20 p-2.5 rounded-full backdrop-blur">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>

          {/* Month and Year Filters */}
          <div className="flex gap-2">
            <div className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs sm:text-sm text-white border border-white/20 backdrop-blur">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-transparent text-white focus:outline-none w-12 appearance-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m} className="text-gray-900">{String(m).padStart(2, '0')}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs sm:text-sm text-white border border-white/20 backdrop-blur">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent text-white focus:outline-none w-14 appearance-none cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y} className="text-gray-900">{y}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Hero Card - Overlapping */}
        <div className="absolute left-4 right-4 sm:left-6 sm:right-6 -bottom-24 max-w-4xl mx-auto bg-gradient-to-br from-emerald-500 to-blue-600 p-6 sm:p-8 rounded-3xl shadow-xl">
          <h2 className="text-xl sm:text-2xl font-semibold text-white">Halo, {userSettings.userName}! 👋</h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-3">Total balance</p>
          <p className="text-3xl sm:text-4xl font-bold text-white mt-2">{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* Main Content - Starts below overlapping hero card */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-32 space-y-6">

        {/* Summary Cards - Income & Expense */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-teal-100 p-2.5 rounded-xl">
                <ArrowUp size={20} className="text-teal-600" />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Pemasukan</p>
            <p className="text-lg sm:text-xl font-bold text-teal-600">{formatCurrency(totalIncome)}</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-xl">
                <ArrowDown size={20} className="text-red-600" />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Pengeluaran</p>
            <p className="text-lg sm:text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        {/* Financial Trend Section */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Tren Keuangan</h2>
            <span className="text-xs sm:text-sm text-gray-500">{getDateRange(dailyData)}</span>
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="#d1d5db"
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ fontSize: '13px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fill="url(#colorIncome)"
                  dot={{ fill: '#14b8a6', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Pemasukan"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#colorExpense)"
                  dot={{ fill: '#ef4444', r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Pengeluaran"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-3">
            {dailyData.map(d => <span key={d.date} className="text-[10px] text-gray-400">{d.date}</span>)}
          </div>
        </div>

        {/* Budget Monitor & Targets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Budget Progress */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Monitor Anggaran
            </h2>
            {totalBudget > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-blue-800">Total Anggaran Bulanan:</span>
                  <span className="text-sm font-bold text-blue-900">{formatCurrency(totalBudget)}</span>
                </div>
              </div>
            )}
            <div className="space-y-3 sm:space-y-4">
              {categoryBudgets.length === 0 ? (
                <p className="text-gray-500 text-center py-6 text-sm">Belum ada kategori dengan batas anggaran</p>
              ) : (
                categoryBudgets.map((category) => {
                  const status = getBudgetStatus(category.percentage);
                  return (
                    <div key={category.id} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <span className="font-medium text-gray-900 text-sm truncate">{category.name}</span>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${status.color}`}>
                          {category.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <Progress value={category.percentage} className="h-1.5 flex-1" />
                      </div>
                      <p className="text-xs text-gray-500 text-right">
                        {formatCurrency(category.spent)} / {formatCurrency(category.budget)}
                      </p>
                      {category.percentage >= 80 && (
                        <p className={`text-xs ${status.color} font-medium`}>
                          ⚠️ {status.status}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Target Progress */}
          {getActiveTargetProgress().length > 0 && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-teal-600" />
                Target Tabungan Aktif
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {getActiveTargetProgress().slice(0, 3).map((tp) => (
                  <div key={tp.target.id} className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm truncate block">{tp.target.nama}</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Target: {formatCurrency(tp.target.nominalTarget)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-emerald-600">
                          {tp.percentage.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(tp.progress)}
                        </p>
                      </div>
                    </div>
                    <Progress value={tp.percentage} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Transaksi Terbaru</h2>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">Belum ada transaksi</p>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {(() => {
                      const IconComponent = getCategoryIcon(transaction.category);
                      return (
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          transaction.type === 'income' ? 'bg-teal-100' : 'bg-red-100'
                        }`}>
                          <IconComponent className={`h-5 w-5 ${
                            transaction.type === 'income' ? 'text-teal-600' : 'text-red-600'
                          }`} />
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{transaction.description}</p>
                      <p className="text-xs text-gray-500 truncate">{transaction.category}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`font-semibold text-sm ${
                      transaction.type === 'income' ? 'text-teal-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 lg:hidden bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow p-4 flex items-center justify-center"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add Transaction Button for Desktop */}
      <div className="hidden lg:block max-w-4xl mx-auto px-6 mt-6 mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 text-white py-4 px-6 rounded-xl hover:from-emerald-600 hover:to-blue-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          Tambah Transaksi Baru
        </button>
      </div>

      {/* Transaction Modal */}
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionSaved={handleTransactionSaved}
      />
    </div>
  );
};

export default ResponsiveDashboard;
