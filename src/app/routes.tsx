import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HomeScreen } from './components/HomeScreen';
import { ListView } from './components/ListView';
import { WorstWards } from './components/WorstWards';
import { ReportScreen } from './components/ReportScreen';
import { ComplaintDetail } from './components/ComplaintDetail';
import { VerifyCleanup } from './components/VerifyCleanup';
import { AdminDashboard } from './components/AdminDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomeScreen },
      { path: 'list', Component: ListView },
      { path: 'worst-wards', Component: WorstWards },
      { path: 'report', Component: ReportScreen },
      { path: 'complaint/:id', Component: ComplaintDetail },
      { path: 'verify/:id', Component: VerifyCleanup },
      { path: 'admin', Component: AdminDashboard },
    ],
  },
]);
