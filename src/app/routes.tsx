import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HomeScreen } from './components/HomeScreen';

// Code-split subroutes with React.lazy to minimize initial bundle size
const ListView = lazy(() => import('./components/ListView').then(m => ({ default: m.ListView })));
const WorstWards = lazy(() => import('./components/WorstWards').then(m => ({ default: m.WorstWards })));
const ReportScreen = lazy(() => import('./components/ReportScreen').then(m => ({ default: m.ReportScreen })));
const ComplaintDetail = lazy(() => import('./components/ComplaintDetail').then(m => ({ default: m.ComplaintDetail })));
const VerifyCleanup = lazy(() => import('./components/VerifyCleanup').then(m => ({ default: m.VerifyCleanup })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

// Accessible fallback loader for lazy routes
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F9FAFB',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid #E5E7EB',
            borderTopColor: '#16A34A',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}>
          Loading CivicSetu...
        </span>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function withSuspense<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
  return function SuspendedComponent(props: P) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomeScreen },
      { path: 'list', Component: withSuspense(ListView) },
      { path: 'worst-wards', Component: withSuspense(WorstWards) },
      { path: 'report', Component: withSuspense(ReportScreen) },
      { path: 'complaint/:id', Component: withSuspense(ComplaintDetail) },
      { path: 'verify/:id', Component: withSuspense(VerifyCleanup) },
      { path: 'admin', Component: withSuspense(AdminDashboard) },
    ],
  },
]);
