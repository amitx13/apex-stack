import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NotFound } from './components/NotFound';
import { useAdminAuthStore } from './stores/useAdminAuthStore';
import { useAxiosInterceptor } from './hooks/useAxiosInterceptor';
import { Logout } from './components/Logout';
import { Login } from './components/Login';
import ProtectedRoute from './RouteRapper';
import { AdminLayout } from './components/layout/AdminLayout';
import { Dashboard } from './components/Dashboard';
import { Users } from './components/Users';
import { UserDetail } from './components/UserDetail';
import { ReentryQueue } from './components/ReentryQueue';
import { Wallets } from './components/Wallets';
import { Transactions } from './components/Transactions';
import { Withdrawals } from './components/Withdrawals';
import BillRequests from './components/BillRequests';
import AutoPayPage from './components/Autopay';
import RechargePlans from './components/RechargePlans';
import Services from './components/Services';
import Vendors from './components/Vendor';
import VendorDetail from './components/VendorDetail';
import VendorWithdrawals from './components/VendorWithdrawals';
import Settings from './components/Settings';
import Payments from './components/Payment';

function App() {
  useAxiosInterceptor();
  const ran = useRef(false)

  const fetchUser = useAdminAuthStore((state) => state.fetchUser);

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    fetchUser();
  }, [fetchUser]);

  return (

    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:userId" element={<UserDetail />} />
        <Route path="/reentry" element={<ReentryQueue />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/withdrawals" element={<Withdrawals />} />
        <Route path="/bill-requests" element={<BillRequests />} />
        <Route path="/autopay" element={<AutoPayPage />} />
        <Route path="/services" element={<Services />} />
        <Route path="/recharge-plans" element={<RechargePlans />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/:id" element={<VendorDetail />} />
        <Route path="/vendor-withdrawals" element={<VendorWithdrawals />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
