import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../App';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    // Hide sidebar and header if not logged in
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 