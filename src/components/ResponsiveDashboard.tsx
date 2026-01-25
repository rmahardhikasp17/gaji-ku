import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, User, Plus, TrendingUp, AlertTriangle, Car, ShoppingBag, Utensils, Briefcase, Heart, Zap, Home, Gift } from 'lucide-react';
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
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-0">
      {/* Gradient Header with Greeting, Date Filters, and Profile */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-500 rounded-2xl shadow-lg p-6 sm:p-8 text-white">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Selamat datang! 👋</h1>
            <p className="text-blue-100 mt-2 text-sm sm:text-base">{userSettings.userName}</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-full">
            <User className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="text-blue-100 text-xs block mb-2">Bulan</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full bg-white bg-opacity-20 text-white rounded-lg px-3 py-2 text-sm border border-blue-300 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m} className="text-gray-900">{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-blue-100 text-xs block mb-2">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full bg-white bg-opacity-20 text-white rounded-lg px-3 py-2 text-sm border border-blue-300 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <option key={y} value={y} className="text-gray-900">{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Large Balance Card */}
        <div className="bg-white bg-opacity-15 rounded-xl p-4 sm:p-6 backdrop-blur">
          <p className="text-blue-100 text-sm mb-2">Total Saldo</p>
          <h2 className="text-4xl sm:text-5xl font-bold">{formatCurrency(balance)}</h2>
        </div>
      </div>

      {/* Income/Expense Summary Cards - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex flex-col items-start">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Pemasukan</p>
            <p className="text-lg sm:text-2xl font-bold text-teal-600 mb-4">{formatCurrency(totalIncome)}</p>
            <div className="bg-teal-100 p-3 rounded-full">
              <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex flex-col items-start">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Pengeluaran</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600 mb-4">{formatCurrency(totalExpense)}</p>
            <div className="bg-red-100 p-3 rounded-full">
              <ArrowDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Trend Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-teal-600" />
            <span className="truncate">Tren Keuangan</span>
          </h2>
          <span className="text-sm text-gray-500">{getDateRange(dailyData)}</span>
        </div>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis
                tickFormatter={(value) => `${value / 1000}k`}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ fontSize: '14px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#14b8a6"
                strokeWidth={2}
                fill="url(#colorIncome)"
                dot={{ fill: '#14b8a6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Pemasukan"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorExpense)"
                dot={{ fill: '#ef4444', r: 4 }}
                activeDot={{ r: 6 }}
                name="Pengeluaran"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts and Budget Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">

        {/* Target Progress (if any active targets) */}
        {getActiveTargetProgress().length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="truncate">Target Tabungan Aktif</span>
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {getActiveTargetProgress().slice(0, 3).map((tp) => (
                <div key={tp.target.id} className="space-y-2">
                  <div className="flex justify-between items-start sm:items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900 text-sm sm:text-base truncate block">{tp.target.nama}</span>
                      <p className="text-xs text-gray-500">
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
                  <Progress value={tp.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget Progress */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            <span className="truncate">Monitor Anggaran</span>
          </h2>
          {totalBudget > 0 && (
            <div className="bg-teal-50 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-teal-800">Total Anggaran Bulanan:</span>
                <span className="text-sm font-bold text-teal-900">{formatCurrency(totalBudget)}</span>
              </div>
            </div>
          )}
          <div className="space-y-3 sm:space-y-4">
            {categoryBudgets.length === 0 ? (
              <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">Belum ada kategori dengan batas anggaran</p>
            ) : (
              categoryBudgets.map((category) => {
                const status = getBudgetStatus(category.percentage);
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{category.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${status.color}`}>
                          {category.percentage.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {formatCurrency(category.spent)} / {formatCurrency(category.budget)}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={category.percentage}
                      className="h-2"
                    />
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
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Transaksi Terbaru</h2>
          <div className="space-y-3 sm:space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">Belum ada transaksi</p>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    {(() => {
                      const IconComponent = getCategoryIcon(transaction.category);
                      return (
                        <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                          transaction.type === 'income' ? 'bg-teal-100' : 'bg-red-100'
                        }`}>
                          <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            transaction.type === 'income' ? 'text-teal-600' : 'text-red-600'
                          }`} />
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{transaction.description}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{transaction.category}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`font-semibold text-sm sm:text-base ${
                      transaction.type === 'income' ? 'text-teal-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
        </div>
      </div>

      {/* Prominent Add Transaction Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 lg:static lg:mt-6 bg-gradient-to-r from-teal-500 to-blue-600 text-white py-4 px-6 rounded-full lg:rounded-lg hover:from-teal-600 hover:to-blue-700 transition-all duration-200 font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl w-14 h-14 lg:w-full lg:h-auto"
      >
        <Plus className="h-6 w-6 lg:h-5 lg:w-5" />
        <span className="hidden lg:inline text-base">Tambah Transaksi Baru</span>
      </button>

      {/* Transaction Form Modal */}
      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionSaved={handleTransactionSaved}
      />
    </div>
  );
};

export default ResponsiveDashboard;
