import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Target, FileDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useDateFilterHelper } from '@/hooks/useDateFilterHelper';
import { useTransactionsByPeriode } from '@/hooks/useTransactionsByPeriode';
import { useKategoriByPeriode } from '@/hooks/useKategoriByPeriode';
import { useTargets } from '@/hooks/useTargets';
import { computeTotals } from '@/domain/transaction';
import { MONTH_NAMES } from '@/domain/constants';
import { formatCurrency } from '@/utils/formatCurrency';
import TransactionTable from '@/components/TransactionTable';
import { exportToPDF } from '@/utils/exportPDF';
import { toast } from '@/hooks/use-toast';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface CategoryUsage {
  id: number;
  name: string;
  type: 'income' | 'expense';
  totalAmount: number;
  budgetLimit?: number;
  percentage: number;
  isOverBudget: boolean;
  color: string;
}

const Laporan: React.FC = () => {
  const { bulan, tahun, getMonthName } = useDateFilterHelper();
  const { transactions } = useTransactionsByPeriode();
  const { categories } = useKategoriByPeriode();
  const { activeTargetProgress } = useTargets();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryUsage, setCategoryUsage] = useState<CategoryUsage[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingYearly, setLoadingYearly] = useState(true);
  const [showCharts, setShowCharts] = useState(false);

  const pieColors = ['#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  const { income: totalIncome, expense: totalExpense, balance: totalBalance } =
    useMemo(() => computeTotals(transactions), [transactions]);

  const totalBudget = useMemo(
    () => categories.filter(c => c.type === 'expense' && c.budgetLimit)
      .reduce((s, c) => s + (c.budgetLimit ?? 0), 0),
    [categories],
  );


  useEffect(() => {
    loadYearlyData();
    calculateCategoryUsage();
  }, [bulan, tahun, transactions, categories]);

  const loadYearlyData = async () => {
    setLoadingYearly(true);
    try {
      // Use indexed range query — only loads current year, not all-time
      const { db } = await import('@/services/database');
      const yearTransactions = await db.transactions
        .where('date')
        .between(`${tahun}-01-01`, `${tahun}-12-31`, true, true)
        .toArray();

      const monthlyStats: MonthlyData[] = Array.from({ length: 12 }, (_, i) => {
        const monthTx = yearTransactions.filter(t => new Date(t.date).getMonth() === i);
        const income  = monthTx.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);
        const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { month: MONTH_NAMES[i].substring(0, 3), income, expense, balance: income - expense };
      });
      setMonthlyData(monthlyStats);
    } catch (error) {
      console.error('Error loading yearly data:', error);
    } finally {
      setLoadingYearly(false);
    }
  };


  const calculateCategoryUsage = () => {
    const categoryStats: CategoryUsage[] = categories.map((category, index) => {
      const categoryTransactions = transactions.filter(t => t.category === category.name);
      const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalForType = transactions
        .filter(t => t.type === category.type)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const percentage = totalForType > 0 ? (totalAmount / totalForType) * 100 : 0;
      const isOverBudget = category.budgetLimit ? totalAmount > category.budgetLimit : false;

      return {
        id: category.id || 0,
        name: category.name,
        type: category.type,
        totalAmount,
        budgetLimit: category.budgetLimit,
        percentage,
        isOverBudget,
        color: category.color || pieColors[index % pieColors.length]
      };
    }).filter(stat => stat.totalAmount > 0);

    setCategoryUsage(categoryStats);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        periode: `${getMonthName(bulan)} ${tahun}`,
        totalIncome, totalExpense, totalBalance, totalBudget,
        transactions,
        categoryUsage: categoryUsage.map(cat => ({
          name: cat.name, type: cat.type,
          totalAmount: cat.totalAmount, percentage: cat.percentage,
        })),
        activeTargets: activeTargetProgress.map(tp => ({
          nama: tp.target.nama, nominalTarget: tp.target.nominalTarget,
          progress: tp.progress, percentage: tp.percentage, status: tp.status,
        })),
      };
      await exportToPDF(exportData);
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Gagal mengekspor PDF', description: 'Terjadi kesalahan saat membuat PDF.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };


  const pieData = [
    { name: 'Pemasukan', value: totalIncome, fill: '#10B981' },
    { name: 'Pengeluaran', value: totalExpense, fill: '#EF4444' }
  ].filter(item => item.value > 0);

  const hasData = transactions.length > 0;

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {getMonthName(bulan)} {tahun}
          </p>
        </div>
        <Button
          onClick={handleExportPDF}
          disabled={isExporting || !hasData}
          className="flex items-center gap-2"
          title={!hasData ? 'Tidak ada data untuk diekspor' : undefined}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Membuat PDF...
            </>
          ) : (
            <><FileDown className="h-4 w-4" /> Export PDF</>
          )}
        </Button>
      </div>

      {/* Empty state — no transactions */}
      {!hasData && (
        <div className="bg-white rounded-xl shadow-sm p-10 sm:p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Belum ada data laporan</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            Laporan akan muncul otomatis setelah Anda mencatat transaksi pertama di bulan ini.
          </p>
          <a
            href="/transaksi"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Catat Transaksi Sekarang
          </a>
        </div>
      )}

      {/* All chart content — only rendered when there IS data */}
      {hasData && (
        <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>

        {totalBudget > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Anggaran</CardTitle>
              <AlertCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalBudget)}</div>
              <p className="text-xs text-gray-500 mt-1">
                Sisa: {formatCurrency(Math.max(0, totalBudget - totalExpense))}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Toggle untuk Secondary Charts */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => setShowCharts(!showCharts)}
          className="rounded-full px-6 bg-white border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
        >
          {showCharts ? 'Sembunyikan Grafik Analisis' : 'Tampilkan Grafik Analisis'}
        </Button>
      </div>

      {/* Charts (Deferred via progressive disclosure) */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Grafik Bulanan {tahun}</CardTitle>
            <CardDescription>Perbandingan pemasukan, pengeluaran, dan saldo per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingYearly ? (
              /* L2 — Skeleton while loadYearlyData() runs */
              <div className="h-80 flex items-end gap-1 px-2">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
                    <div className="animate-pulse bg-gray-200 rounded" style={{ height: `${30 + Math.random() * 60}%` }} />
                    <div className="animate-pulse bg-gray-100 rounded" style={{ height: `${10 + Math.random() * 40}%` }} />
                  </div>
                ))}
              </div>
            ) : (
              <ChartContainer className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${value / 1000}K`} />
                    <Tooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'income' ? 'Pemasukan' :
                        name === 'expense' ? 'Pengeluaran' : 'Saldo'
                      ]}
                    />
                    <Bar dataKey="income" fill="#10B981" name="Pemasukan" />
                    <Bar dataKey="expense" fill="#EF4444" name="Pengeluaran" />
                    <Bar dataKey="balance" fill="#3B82F6" name="Saldo" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi {getMonthName(bulan)} {tahun}</CardTitle>
            <CardDescription>Perbandingan total pemasukan vs pengeluaran</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [formatCurrency(value)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Active Targets Section */}
      {activeTargetProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Target Tabungan Aktif
            </CardTitle>
            <CardDescription>
              Progress target tabungan yang sedang berjalan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto w-full">
              <div className="min-w-[580px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Target</TableHead>
                      <TableHead>Target Nominal</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Persentase</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTargetProgress.map((tp) => (
                      <TableRow key={tp.target.id}>
                        <TableCell className="font-medium">{tp.target.nama}</TableCell>
                        <TableCell>{formatCurrency(tp.target.nominalTarget)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {formatCurrency(tp.progress)}
                            </div>
                            <Progress value={tp.percentage} className="h-2 w-20" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            tp.percentage >= 100 ? 'text-green-600' :
                            tp.percentage >= 80 ? 'text-yellow-600' : 'text-blue-600'
                          }`}>
                            {tp.percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tp.status === 'completed' ? 'bg-green-100 text-green-800' :
                            tp.status === 'ahead' ? 'bg-blue-100 text-blue-800' :
                            tp.status === 'behind' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {
                              tp.status === 'completed' ? 'Tercapai' :
                              tp.status === 'ahead' ? 'Unggul' :
                              tp.status === 'behind' ? 'Tertinggal' :
                              'Sesuai Target'
                            }
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        </>
      )}
    </div>
  );
};

export default Laporan;
