import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Toaster } from 'sonner';

export const MainLayout = () => {
  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Noise overlay */}
      <div className="noise-overlay" />
      
      {/* Top bar with language switcher */}
      <div className="fixed top-0 right-0 z-50 p-4 lg:p-6">
        <LanguageSwitcher />
      </div>
      
      <Sidebar />
      
      <main className="lg:ml-60 min-h-screen p-4 lg:p-6" data-testid="main-content">
        <div className="max-w-[1600px] mx-auto pt-14 lg:pt-0">
          <Outlet />
        </div>
      </main>

      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0A0A0A',
            border: '1px solid #27272A',
            color: '#FFFFFF',
          },
        }}
      />
    </div>
  );
};
