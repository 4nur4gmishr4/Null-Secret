import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './layouts/Layout';
import Preloader from './components/Preloader';
import ErrorBoundary from './components/ErrorBoundary';
import { auth } from './utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const Landing = React.lazy(() => import('./pages/Landing'));
const Home = React.lazy(() => import('./pages/Home'));
const Success = React.lazy(() => import('./pages/Success'));
const ViewSecret = React.lazy(() => import('./pages/ViewSecret'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const SuperAdmin = React.lazy(() => import('./pages/SuperAdmin'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const Authscreen = React.lazy(() => import('./components/Authscreen'));
const Signup = React.lazy(() => import('./components/Signup'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const UsageHistory = React.lazy(() => import('./pages/UsageHistory'));
const SecuritySettings = React.lazy(() => import('./pages/SecuritySettings'));
const TwoFactorSetup = React.lazy(() => import('./pages/TwoFactorSetup'));
const BiometricSetup = React.lazy(() => import('./pages/BiometricSetup'));
const SessionTimeout = React.lazy(() => import('./pages/SessionTimeout'));
const DeviceSessions = React.lazy(() => import('./pages/DeviceSessions'));
const DestroyVault = React.lazy(() => import('./pages/DestroyVault'));
const AccountSettings = React.lazy(() => import('./pages/AccountSettings'));

import { useToast } from './contexts/ToastContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <svg className="animate-spin h-6 w-6" style={{ color: 'var(--text-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const NotFound: React.FC = () => (
  <div className="text-center py-24 space-y-4 slide-up">
    <h2 className="text-4xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>404</h2>
    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
      We could not find this page. Either the link is wrong, or the secret it pointed to has already self-destructed.
    </p>
    <a
      href="/"
      className="btn btn-secondary mx-auto text-xs tracking-wider uppercase inline-flex"
      style={{ textDecoration: 'none' }}
    >
      Return Home
    </a>
  </div>
);

const OfflineDetector: React.FC = () => {
  const { toast } = useToast();

  React.useEffect(() => {
    const handleOffline = () => {
      toast('You are currently offline. Please reconnect to send or view secrets.', 'error');
    };
    const handleOnline = () => {
      toast('Back online!', 'success');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [toast]);

  return null;
};

const App: React.FC = () => {
  const [preloaderDone, setPreloaderDone] = useState(false);

  const handlePreloaderComplete = React.useCallback(() => {
    setPreloaderDone(true);
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <OfflineDetector />
        {!preloaderDone && <Preloader onComplete={handlePreloaderComplete} />}
        <Router>
        <Layout>
          <ErrorBoundary>
          <Suspense fallback={
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <svg className="animate-spin h-6 w-6" style={{ color: 'var(--text-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <div className="text-xs font-semibold tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>
                Loading…
              </div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/s/:id" element={<Success />} />
              <Route path="/v/:id" element={<ViewSecret />} />
              <Route path="/admin/:id" element={<AdminDashboard />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/login" element={<Authscreen />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/history" element={<ProtectedRoute><UsageHistory /></ProtectedRoute>} />
              <Route path="/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
              <Route path="/security/2fa" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
              <Route path="/security/biometric" element={<ProtectedRoute><BiometricSetup /></ProtectedRoute>} />
              <Route path="/security/timeout" element={<ProtectedRoute><SessionTimeout /></ProtectedRoute>} />
              <Route path="/security/sessions" element={<ProtectedRoute><DeviceSessions /></ProtectedRoute>} />
              <Route path="/security/destroy" element={<ProtectedRoute><DestroyVault /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </Layout>
      </Router>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;