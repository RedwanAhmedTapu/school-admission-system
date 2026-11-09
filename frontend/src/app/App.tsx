import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { TooltipProvider, Toaster } from '../components/ui/overlay';
import { AdminLayout } from '../layouts/AdminLayout';
import { PortalLayout } from '../layouts/PortalLayout';
import LandingPage from '../pages/LandingPage';
import ApplicationsPage from '../pages/ApplicationsPage';
import AdminOverview from '../pages/admin/AdminOverview';
import AdminClasses from '../pages/admin/AdminClasses';
import AdminApplications from '../pages/admin/AdminApplications';
import { AppError } from '../services/api';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2000,
        refetchOnWindowFocus: true, // coming back to the tab refreshes seats and statuses at once
        refetchIntervalInBackground: false, // no polling while the tab is hidden
        retry: (count, err) => !(err instanceof AppError && err.status && err.status < 500) && count < 2,
      },
    },
  });
}

const queryClient = makeQueryClient();

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PortalLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="applications" element={<AdminApplications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppRoutes />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
