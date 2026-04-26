import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './layouts/Layout';
import Preloader from './components/Preloader';

const Landing = React.lazy(() => import('./pages/Landing'));
const Home = React.lazy(() => import('./pages/Home'));
const Success = React.lazy(() => import('./pages/Success'));
const ViewSecret = React.lazy(() => import('./pages/ViewSecret'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const Authscreen = React.lazy(() => import('./components/Authscreen'));
const Signup = React.lazy(() => import('./components/Signup'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const UsageHistory = React.lazy(() => import('./pages/UsageHistory'));
const SecuritySettings = React.lazy(() => import('./pages/SecuritySettings'));

const NotFound: React.FC = () => (
  <div className="text-center py-24 space-y-4 slide-up">
    <h2 className="text-4xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>404</h2>
    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
      This page doesn't exist or the secret has been destroyed.
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

const App: React.FC = () => {
  const [preloaderDone, setPreloaderDone] = useState(false);

  const handlePreloaderComplete = React.useCallback(() => {
    setPreloaderDone(true);
  }, []);

  return (
    <ThemeProvider>
      {!preloaderDone && <Preloader onComplete={handlePreloaderComplete} />}
      <Router>
        <Layout>
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
              <Route path="/app" element={<Home />} />
              <Route path="/s/:id" element={<Success />} />
              <Route path="/v/:id" element={<ViewSecret />} />
              <Route path="/admin/:id" element={<AdminDashboard />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/login" element={<Authscreen />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/history" element={<UsageHistory />} />
              <Route path="/security" element={<SecuritySettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </ThemeProvider>
  );
};

export default App;