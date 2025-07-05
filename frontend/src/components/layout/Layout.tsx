import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../App';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!user) {
    // Hide sidebar and header if not logged in
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onHamburgerClick={() => setSidebarOpen(true)} />
      <div className="flex">
        {/* Sidebar for desktop */}
        <div className="hidden lg:block">
          <Sidebar isMobile={false} />
        </div>
        {/* Sidebar for mobile (slide-in) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black opacity-30" onClick={() => setSidebarOpen(false)} />
            {/* Sidebar */}
            <div className="relative z-50">
              <Sidebar isMobile={true} onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 