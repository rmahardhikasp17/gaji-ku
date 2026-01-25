import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Download, Upload, Trash2, Sun, Moon, Monitor, User, Save, Mail, Bell, Shield, Palette, Globe, CreditCard, ChevronRight } from 'lucide-react';
import { db } from '@/services/database';
import { useUserSettings } from '@/hooks/useUserSettings';
import { emailService, EmailConfig } from '@/services/emailService';

const Pengaturan: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { userSettings, loading: userLoading, updateUserSettings } = useUserSettings();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    userName: '',
    userEmail: ''
  });
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    enabled: false
  });
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState<EmailConfig>({
    enabled: false
  });

  // Export data to JSON
  const handleExportData = async () => {
    try {
      const transactions = await db.transactions.toArray();
      const categories = await db.categories.toArray();
      const settings = await db.settings.toArray();

      const exportData = {
        transactions,
        categories,
        settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dompet-bergerak-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Berhasil Diekspor",
        description: "File backup telah diunduh ke perangkat Anda.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Gagal Mengekspor Data",
        description: "Terjadi kesalahan saat mengekspor data.",
        variant: "destructive",
      });
    }
  };

  // Import data from JSON
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // Validate data structure
        if (!jsonData.transactions || !jsonData.categories) {
          throw new Error('Invalid backup file format');
        }

        // Clear existing data
        await db.transaction('rw', db.transactions, db.categories, db.settings, async () => {
          await db.transactions.clear();
          await db.categories.clear();
          await db.settings.clear();

          // Import data
          if (jsonData.transactions.length > 0) {
            await db.transactions.bulkAdd(jsonData.transactions);
          }
          if (jsonData.categories.length > 0) {
            await db.categories.bulkAdd(jsonData.categories);
          }
          if (jsonData.settings?.length > 0) {
            await db.settings.bulkAdd(jsonData.settings);
          }
        });

        toast({
          title: "Data Berhasil Diimpor",
          description: "Data backup telah berhasil dipulihkan.",
        });

        // Refresh the page to show updated data
        window.location.reload();
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Gagal Mengimpor Data",
          description: "File backup tidak valid atau rusak.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    // Reset input value
    event.target.value = '';
  };

  // Reset all data
  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await db.transaction('rw', db.transactions, db.categories, db.settings, async () => {
        await db.transactions.clear();
        await db.categories.clear();
        await db.settings.clear();
      });

      toast({
        title: "Data Berhasil Dihapus",
        description: "Semua data telah dihapus dari aplikasi.",
      });

      setIsResetDialogOpen(false);
      
      // Refresh to show empty state
      window.location.reload();
    } catch (error) {
      console.error('Reset error:', error);
      toast({
        title: "Gagal Menghapus Data",
        description: "Terjadi kesalahan saat menghapus data.",
        variant: "destructive",
      });
    }
    setIsResetting(false);
  };

  // Theme management
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }

    toast({
      title: "Tema Berhasil Diubah",
      description: `Tema telah diatur ke ${newTheme === 'light' ? 'Terang' : newTheme === 'dark' ? 'Gelap' : 'Mengikuti Sistem'}.`,
    });
  };

  const handleEditProfile = () => {
    setProfileForm({
      userName: userSettings.userName,
      userEmail: userSettings.userEmail || ''
    });
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserSettings({
        userName: profileForm.userName || 'Pengguna',
        userEmail: profileForm.userEmail
      });
      setEditingProfile(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCancelEdit = () => {
    setEditingProfile(false);
    setProfileForm({
      userName: userSettings.userName,
      userEmail: userSettings.userEmail || ''
    });
  };

  // Load email configuration
  React.useEffect(() => {
    const loadEmailConfig = async () => {
      try {
        const config = await emailService.loadConfig();
        setEmailConfig(config);
        setEmailForm(config);
      } catch (error) {
        console.error('Error loading email config:', error);
      }
    };
    loadEmailConfig();
  }, []);

  const handleEditEmail = () => {
    setEmailForm(emailConfig);
    setEditingEmail(true);
  };

  const handleSaveEmail = async () => {
    try {
      await emailService.saveConfig(emailForm);
      setEmailConfig(emailForm);
      setEditingEmail(false);
      toast({
        title: "Pengaturan Email Berhasil Disimpan",
        description: "Konfigurasi notifikasi email telah diperbarui.",
      });
    } catch (error) {
      toast({
        title: "Gagal Menyimpan Pengaturan Email",
        description: "Terjadi kesalahan saat menyimpan konfigurasi email.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEmailEdit = () => {
    setEditingEmail(false);
    setEmailForm(emailConfig);
  };

  const handleTestEmail = async () => {
    try {
      const isValid = await emailService.testConnection();
      if (isValid) {
        toast({
          title: "Konfigurasi Email Valid",
          description: "Pengaturan email sudah benar dan siap digunakan.",
        });
      } else {
        toast({
          title: "Konfigurasi Email Tidak Lengkap",
          description: "Harap lengkapi semua field yang diperlukan.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Testing Email",
        description: "Terjadi kesalahan saat mengetes konfigurasi email.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Premium Gradient Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 pt-12 pb-24 px-6">
        <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
        <p className="text-emerald-100 text-sm">Kelola akun dan preferensi aplikasi Anda</p>
      </div>

      {/* Settings Content (Overlapping Card) */}
      <div className="max-w-4xl mx-auto -mt-12 px-4 space-y-6">

        {/* Section: Akun & Keamanan */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">Akun & Keamanan</h2>
          </div>
          
          {editingProfile ? (
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="userName" className="text-sm font-medium text-gray-700">Nama Pengguna</Label>
                <Input
                  id="userName"
                  value={profileForm.userName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, userName: e.target.value }))}
                  placeholder="Masukkan nama Anda"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="userEmail" className="text-sm font-medium text-gray-700">Email (Opsional)</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={profileForm.userEmail}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, userEmail: e.target.value }))}
                  placeholder="nama@email.com"
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveProfile} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Simpan
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <>
              <SettingItem 
                icon={<User size={20} className="text-blue-500" />} 
                title="Profil Pengguna" 
                desc={userSettings.userName || "Belum diatur"}
                onAction={handleEditProfile}
              />
              <SettingItem 
                icon={<Mail size={20} className="text-blue-500" />} 
                title="Email" 
                desc={userSettings.userEmail || "Belum diatur"}
                onAction={handleEditProfile}
              />
            </>
          )}
        </section>

        {/* Section: Preferensi */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">Preferensi</h2>
          </div>
          
          {/* Theme Settings */}
          <div className="p-6 border-b border-gray-50">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-100 rounded-lg mt-0.5">
                  <Palette size={20} className="text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Tema Aplikasi</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Pilih mode gelap atau terang</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('light')}
                size="sm"
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Terang
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('dark')}
                size="sm"
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Gelap
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('system')}
                size="sm"
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                Sistem
              </Button>
            </div>
          </div>

          <SettingItem 
            icon={<CreditCard size={20} className="text-teal-500" />} 
            title="Mata Uang" 
            desc="IDR (Rp) - Rupiah Indonesia"
          />
        </section>

        {/* Section: Notifikasi & Pengaturan Lanjut */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">Notifikasi</h2>
          </div>

          {editingEmail ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-enabled"
                  checked={emailForm.enabled}
                  onCheckedChange={(enabled) => setEmailForm(prev => ({ ...prev, enabled }))}
                />
                <Label htmlFor="email-enabled" className="text-sm font-medium">Aktifkan notifikasi email</Label>
              </div>

              {emailForm.enabled && (
                <>
                  <div>
                    <Label htmlFor="smtpHost" className="text-sm font-medium text-gray-700">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={emailForm.smtpHost || ''}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, smtpHost: e.target.value }))}
                      placeholder="smtp.gmail.com"
                      className="mt-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtpPort" className="text-sm font-medium text-gray-700">SMTP Port</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={emailForm.smtpPort || 587}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                        placeholder="587"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtpUser" className="text-sm font-medium text-gray-700">Email/Username</Label>
                      <Input
                        id="smtpUser"
                        type="email"
                        value={emailForm.smtpUser || ''}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, smtpUser: e.target.value }))}
                        placeholder="your.email@gmail.com"
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="smtpPassword" className="text-sm font-medium text-gray-700">Password/App Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={emailForm.smtpPassword || ''}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, smtpPassword: e.target.value }))}
                      placeholder="Password atau App Password"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromEmail" className="text-sm font-medium text-gray-700">Email Pengirim</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={emailForm.fromEmail || ''}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                      placeholder="noreply@example.com"
                      className="mt-2"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button onClick={handleSaveEmail} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Simpan
                </Button>
                <Button variant="outline" onClick={handleCancelEmailEdit}>
                  Batal
                </Button>
                {emailForm.enabled && (
                  <Button variant="outline" onClick={handleTestEmail} className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Test
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <SettingItem 
              icon={<Bell size={20} className="text-orange-500" />} 
              title="Notifikasi Email" 
              desc={emailConfig.enabled ? `✅ Aktif (${emailConfig.smtpHost})` : "❌ Belum dikonfigurasi"}
              onAction={handleEditEmail}
            />
          )}
        </section>

        {/* Section: Kelola Data */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="font-semibold text-gray-800">Kelola Data</h2>
          </div>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Download size={20} className="text-green-500" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-900">Export Data</h3>
                <p className="text-xs text-gray-500">Unduh backup dalam format JSON</p>
              </div>
            </div>
            <Button onClick={handleExportData} variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Unduh
            </Button>
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Upload size={20} className="text-blue-500" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-900">Import Data</h3>
                <p className="text-xs text-gray-500">Pulihkan dari file backup JSON</p>
              </div>
            </div>
            <div>
              <input
                type="file"
                id="import-file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Unggah
              </Button>
            </div>
          </button>

          <div className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 size={20} className="text-red-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-medium text-gray-900">Reset Semua Data</h3>
                  <p className="text-xs text-gray-500">Hapus seluruh data aplikasi</p>
                </div>
              </div>
            </div>
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                  Hapus Semua Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Konfirmasi Hapus Data</DialogTitle>
                  <DialogDescription>
                    Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan. Pastikan Anda telah membuat backup data terlebih dahulu.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsResetDialogOpen(false)}
                    disabled={isResetting}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleResetData}
                    disabled={isResetting}
                  >
                    {isResetting ? 'Menghapus...' : 'Ya, Hapus Semua'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Tips Section */}
        <section className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-2xl shadow-sm border border-blue-100 p-6 mb-6">
          <h2 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span> Tips Penggunaan
          </h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-3">
              <span className="mt-1">✓</span>
              <span>Backup data secara berkala untuk keamanan</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1">✓</span>
              <span>Gunakan App Password untuk Gmail, bukan password biasa</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1">✓</span>
              <span>Notifikasi email akan dikirim ke email yang terdaftar</span>
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
};

// Reusable Setting Item Component
interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onAction?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
  icon, 
  title, 
  desc, 
  onAction,
  toggle = false,
  toggleValue = false,
  onToggleChange
}) => (
  <button 
    onClick={onAction}
    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
  >
    <div className="flex items-center gap-4">
      <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      <div className="text-left">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
    {toggle ? (
      <div 
        className="w-10 h-6 bg-teal-500 rounded-full flex items-center px-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onToggleChange?.(!toggleValue);
        }}
      >
        <div className="w-4 h-4 bg-white rounded-full shadow-sm ml-auto" />
      </div>
    ) : (
      <ChevronRight size={18} className="text-gray-400" />
    )}
  </button>
);

export default Pengaturan;
