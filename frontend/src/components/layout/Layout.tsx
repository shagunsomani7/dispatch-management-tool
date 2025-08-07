import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../App';

interface LayoutProps {
  children: React.ReactNode;
}

function _s1gn4tur3() {
  const s = [
    'Made', 'with', 'Love', 'by',
    'Shagun', 'Krishna',
    'https://www.linkedin.com/in/shagun-somani-644aa41b6/',
    'https://www.linkedin.com/in/krishnamundra4/'
  ];
  return (
    <div
      style={{
        position: 'fixed',
        right: 8,
        bottom: 4,
        zIndex: 9999,
        fontSize: '11px',
        opacity: 0.25,
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily: 'monospace',
        letterSpacing: '0.02em',
      }}
      aria-hidden="true"
    >
      <span>{s[0]} {s[1]} <span style={{ color: '#e25555' }}>♥</span> {s[2]} {s[3]} </span>
      <a
        href={s[6]}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#0072b1', textDecoration: 'none', pointerEvents: 'auto', opacity: 0.7 }}
      >
        {s[4]}
      </a>
      <span> &amp; </span>
      <a
        href={s[7]}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#0072b1', textDecoration: 'none', pointerEvents: 'auto', opacity: 0.7 }}
      >
        {s[5]}
      </a>
    </div>
  );
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!user) {
    // Hide sidebar and header if not logged in
    return <main className="min-h-screen bg-gray-50">{children}{_s1gn4tur3()}</main>;
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
          {_s1gn4tur3()}
        </main>
      </div>
    </div>
  );
};

export default Layout; 