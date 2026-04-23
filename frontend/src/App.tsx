import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './layouts/Layout';
import Preloader from './components/Preloader';

const Landing = React.lazy(() => import('./pages/Landing'));
const Home = React.lazy(() => import('./pages/Home'));
const Success = React.lazy(() => import('./pages/Success'));
const ViewSecret = React.lazy(() => import('./pages/ViewSecret'));

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

  return (
    <ThemeProvider>
      {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}
      <Router>
        <Layout>
          <Suspense fallback={
            <div className="py-20 text-center text-xs font-semibold tracking-widest uppercase animate-pulse" style={{ color: 'var(--text-tertiary)' }}>
              Loading…
            </div>
          }>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<Home />} />
              <Route path="/s/:id" element={<Success />} />
              <Route path="/v/:id" element={<ViewSecret />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </ThemeProvider>
  );
};

export default App;