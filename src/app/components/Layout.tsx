import { Outlet, useLocation } from 'react-router';
import { useEffect } from 'react';

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = location.pathname.startsWith('/admin');

  // Lock body scroll for the map-based home screen only
  useEffect(() => {
    if (isHome) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100dvh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isHome]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        background: isHome ? '#F3F4F6' : isAdmin ? '#F8FAFC' : '#E5E7EB',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Home & Admin: full width on desktop. Other subpages: centered card max 600px on desktop */}
      <div
        style={{
          width: '100%',
          maxWidth: isHome || isAdmin ? '100%' : 600,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'white',
          position: 'relative',
          overflow: isHome ? 'hidden' : 'auto',
          boxShadow: isHome || isAdmin ? 'none' : '0 4px 24px rgba(0,0,0,0.1)',
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
