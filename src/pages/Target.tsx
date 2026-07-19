import React, { useState } from 'react';
import { Plus, Target as TargetIcon, TrendingUp, Calendar, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTargets } from '@/hooks/useTargets';
import { formatCurrency, formatInputNumber, parseNumber } from '@/utils/formatCurrency';
import { getTargetStatus, MONTH_NAMES } from '@/domain/constants';
import { Target } from '@/services/database';
import { toast } from '@/hooks/use-toast';

const MONTHS = MONTH_NAMES as unknown as string[];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear + i);

const emptyForm = () => ({
  nama: '',
  nominalTarget: '',
  bulanMulai:   new Date().getMonth() + 1,
  tahunMulai:   new Date().getFullYear(),
  bulanSelesai: new Date().getMonth() + 1,
  tahunSelesai: new Date().getFullYear() + 1,
});

const TargetPage: React.FC = () => {
  const { targetProgress, activeTargetProgress, loading, addTarget, updateTarget, deleteTarget } = useTargets();
  const [isAddOpen,    setIsAddOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<Target | null>(null);
  const [deleteId,     setDeleteId]     = useState<number | null>(null);
  const [formData,     setFormData]     = useState(emptyForm());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseNumber(formData.nominalTarget);
    if (!formData.nama || amount <= 0) return;

    // C3 — Validate end date >= start date to prevent NaN% in progress
    const startTotal = formData.tahunMulai * 12 + formData.bulanMulai;
    const endTotal   = formData.tahunSelesai * 12 + formData.bulanSelesai;
    if (endTotal < startTotal) {
      toast({ title: 'Tanggal tidak valid', description: 'Tanggal selesai harus sama dengan atau lebih dari tanggal mulai.', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        nama:          formData.nama,
        nominalTarget: amount,
        bulanMulai:    formData.bulanMulai,
        tahunMulai:    formData.tahunMulai,
        bulanSelesai:  formData.bulanSelesai,
        tahunSelesai:  formData.tahunSelesai,
      };
      if (editTarget) {
        await updateTarget(editTarget.id!, payload);
        setEditTarget(null);
      } else {
        await addTarget(payload);
        setIsAddOpen(false);
      }
      setFormData(emptyForm());
    } catch { /* toast shown in hook */ }
  };

  const openEdit = (target: Target) => {
    setEditTarget(target);
    setFormData({
      nama:          target.nama,
      nominalTarget: target.nominalTarget.toString(),
      bulanMulai:    target.bulanMulai,
      tahunMulai:    target.tahunMulai,
      bulanSelesai:  target.bulanSelesai,
      tahunSelesai:  target.tahunSelesai,
    });
  };

  const TargetForm = (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="t-nama">Nama Target</Label>
        <Input id="t-nama" value={formData.nama}
          onChange={e => setFormData(p => ({ ...p, nama: e.target.value }))}
          placeholder="Contoh: Beli Laptop" required />
      </div>
      <div>
        <Label htmlFor="t-nominal">Nominal Target (Rp)</Label>
        <Input id="t-nominal" value={formData.nominalTarget}
          onChange={e => setFormData(p => ({ ...p, nominalTarget: formatInputNumber(e.target.value) }))}
          placeholder="0" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Bulan Mulai</Label>
          <Select value={formData.bulanMulai.toString()} onValueChange={v => setFormData(p => ({ ...p, bulanMulai: +v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tahun Mulai</Label>
          <Select value={formData.tahunMulai.toString()} onValueChange={v => setFormData(p => ({ ...p, tahunMulai: +v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Bulan Selesai</Label>
          <Select value={formData.bulanSelesai.toString()} onValueChange={v => setFormData(p => ({ ...p, bulanSelesai: +v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={(i+1).toString()}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tahun Selesai</Label>
          <Select value={formData.tahunSelesai.toString()} onValueChange={v => setFormData(p => ({ ...p, tahunSelesai: +v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );

  if (loading) {
    return (
      <div className="space-y-6 pb-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-64" />
          </div>
          <div className="h-10 bg-gray-200 rounded w-36" />
        </div>
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0,1,2].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 h-24">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
        {/* Target cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {[0,1,2].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-2 bg-gray-200 rounded-full" />
              <div className="flex justify-between">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Target Tabungan</h1>
          <p className="text-gray-600 mt-1">Kelola dan pantau target keuangan Anda</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Tambah Target</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Target Tabungan</DialogTitle>
              <DialogDescription>Buat target tabungan baru untuk mencapai tujuan keuangan Anda.</DialogDescription>
            </DialogHeader>
            {TargetForm}
            <div className="pt-2">
              <Button type="submit" form="" onClick={handleSubmit} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                Simpan Target
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active summary */}
      {activeTargetProgress.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Target Aktif</CardTitle>
              <TargetIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{activeTargetProgress.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Target</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(activeTargetProgress.reduce((s, tp) => s + tp.target.nominalTarget, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress Rata-rata</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(activeTargetProgress.reduce((s, tp) => s + tp.percentage, 0) / activeTargetProgress.length)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Target cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {targetProgress.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <TargetIcon className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Belum Ada Target</h3>
              <p className="text-sm text-gray-500 text-center mb-6 max-w-sm">
                Catat target finansial Anda (misal: Beli Laptop) lalu isi saldonya lewat Halaman Transaksi.
              </p>
              <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl px-6 py-5">
                <Plus className="h-4 w-4" /> Mulai Target Pertama
              </Button>
            </CardContent>
          </Card>
        ) : (
          targetProgress.map(tp => {
            const st = getTargetStatus(tp.status);
            return (
              <Card 
                key={tp.target.id} 
                className="card-interactive cursor-pointer border-gray-100 hover:border-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => openEdit(tp.target)}
              >
                <CardHeader className="pb-3 border-b border-gray-50 mb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-bold text-gray-900 truncate">
                        {tp.target.nama}
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-gray-400 mt-1">
                        {MONTHS[tp.target.bulanMulai - 1]} {tp.target.tahunMulai} — {MONTHS[tp.target.bulanSelesai - 1]} {tp.target.tahunSelesai}
                      </CardDescription>
                    </div>
                    <span className={`px-2.5 py-1 flex-shrink-0 rounded-md text-[10px] font-bold uppercase tracking-wider ${st.color}`}>
                      {st.text}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-gray-600">
                        {formatCurrency(tp.progress)} / {formatCurrency(tp.target.nominalTarget)}
                      </span>
                    </div>
                    <Progress value={tp.percentage} className="h-2" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">{tp.percentage.toFixed(1)}%</span>
                      <span className="text-xs text-gray-500">Sisa: {formatCurrency(tp.remainingAmount)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Target Bulanan:</span>
                      <p className="font-medium">{formatCurrency(tp.monthlyTarget)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Sisa Waktu:</span>
                      <p className="font-medium">{tp.remainingMonths} bulan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) { setEditTarget(null); setFormData(emptyForm()); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Target</DialogTitle>
            <DialogDescription>Ubah detail target tabungan Anda.</DialogDescription>
          </DialogHeader>
          {TargetForm}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleSubmit} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
              Simpan Perubahan
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-11 text-red-500 border-red-100 hover:bg-red-50 hover:text-red-700 rounded-xl"
              onClick={() => {
                setDeleteId(editTarget!.id!);
                setEditTarget(null);
              }}
            >
              Hapus Target
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Target?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus target tabungan secara permanen. Transfer yang sudah dilakukan tidak akan terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={async () => { if (deleteId) { await deleteTarget(deleteId); setDeleteId(null); } }}>
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TargetPage;