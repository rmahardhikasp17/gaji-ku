import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  FolderOpen, 
  ChartPie, 
  Settings,
  Calendar,
  Target,
  Menu,
  X,
  MoreHorizontal,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import FilterTanggalGlobal from './FilterTanggalGlobal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Primary bottom nav items (Max 4 for optimal mobile tap targets)
  const primaryNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transaksi', icon: FileText, label: 'Transaksi' },
    { path: '/laporan', icon: ChartPie, label: 'Laporan' },
  ];

  // Secondary items go into the "Menu" sheet
  const secondaryNavItems = [
    { path: '/kategori', icon: FolderOpen, label: 'Kategori' },
    { path: '/target', icon: Target, label: 'Target' },
    { path: '/pengaturan', icon: Settings, label: 'Pengaturan' },
  ];

  // All pages for desktop sidebar
  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  // Get current page index for swipe navigation
  const getCurrentPageIndex = () => {
    return allNavItems.findIndex(item => item.path === location.pathname);
  };

  // Swipe between pages
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = getCurrentPageIndex();
      if (currentIndex !== -1 && currentIndex < allNavItems.length - 1) {
        if (navigator.vibrate) navigator.vibrate(50);
        navigate(allNavItems[currentIndex + 1].path);
      }
    },
    onSwipedRight: () => {
      const currentIndex = getCurrentPageIndex();
      if (currentIndex > 0) {
        if (navigator.vibrate) navigator.vibrate(50);
        navigate(allNavItems[currentIndex - 1].path);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 60, // Minimum swipe distance
    swipeDuration: 500, // Maximum swipe duration
    touchEventOptions: { passive: true }, // passive:true allows native scroll to work unobstructed
  });

  const NavLink = ({ item, onClick }: { item: typeof allNavItems[0], onClick?: () => void }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-emerald-500 to-blue-600 text-white shadow-md transform scale-[0.98]'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:scale-[0.98]'
        }`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  const MobileNavItem = ({ item }: { item: typeof primaryNavItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <Link
        to={item.path}
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(30);
        }}
        aria-label={`Navigasi ke ${item.label}`}
        className={`flex flex-col items-center space-y-0.5 sm:space-y-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 max-w-[80px] relative ${
          isActive
            ? 'text-emerald-600'
            : 'text-gray-400 hover:text-gray-600 active:scale-95'
        }`}
      >
        <div className={`p-1.5 rounded-lg transition-all duration-200 ${
          isActive ? 'bg-emerald-50' : ''
        }`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 transition-transform duration-200 ${
            isActive ? 'scale-110' : ''
          }`} />
        </div>
        <span className={`text-xs font-medium text-center truncate w-full leading-tight ${
          isActive ? 'font-semibold' : ''
        }`}>{item.label}</span>
        {/* Active dot indicator */}
        {isActive && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Mobile Header (Simplified) */}
      <header className="bg-gradient-to-r from-emerald-500 to-blue-600 shadow-lg lg:hidden flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white tracking-wide">Gajiku</h1>
          </div>
          {/* Mobile Date Filter */}
          <FilterTanggalGlobal />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-blue-600 shadow-lg hidden lg:block flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">Gajiku</h1>
            </div>

            {/* Desktop Filter */}
            <FilterTanggalGlobal />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-8 gap-3 sm:gap-4 lg:gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm p-4 sticky top-8">
            <div className="space-y-2">
              {allNavItems.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content with Swipe Support */}
        {/* overflow-x must NOT be on main itself — it would block mouse-wheel/trackpad scroll */}
        <main className="flex-1 min-w-0" {...swipeHandlers}>
          {/* Clip horizontal overflow via a child wrapper, leaving vertical scroll free */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6 pb-12 [overflow-x:clip]">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation — 4 items strictly */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="px-1 py-1.5 flex justify-around items-center">
          {primaryNavItems.map((item) => (
            <MobileNavItem key={item.path} item={item} />
          ))}
          
          {/* Mobile Menu Tab */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Menu"
                className={`flex flex-col items-center space-y-0.5 sm:space-y-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all min-w-0 flex-1 max-w-[80px] text-gray-400 hover:text-gray-600 active:scale-95`}
              >
                <div className="p-1.5 rounded-lg">
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                </div>
                <span className="text-xs font-medium text-center truncate w-full leading-tight">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="w-full p-0 rounded-t-2xl">
              <div className="p-6 pb-8 space-y-2">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">Lainnya</h3>
                {secondaryNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    item={item}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Bottom padding for mobile navigation — expands dynamically when sheet/menu is open */}
      <div className={`lg:hidden flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'h-40 sm:h-44' : 'h-20 sm:h-24'}`}></div>
    </div>
  );
};

export default Layout;
