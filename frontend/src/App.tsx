import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './layouts/Layout';
import Preloader from './components/Preloader';

const Landing = React.lazy(() => import('./pages/Landing'));
const Home = React.lazy(() => import('./pages/Home'));
const Success = React.lazy(() => import('./pages/Success'));
const ViewSecret = React.lazy(() => import('./pages/ViewSecret'));

const App: React.FC = () => {
  const [preloaderDone, setPreloaderDone] = useState(false);

  return (
    <ThemeProvider>
      {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}
      <Router>
        <Layout>
          <Suspense fallback={
            <div className="py-20 text-center text-sm font-medium animate-pulse" style={{ color: 'var(--muted)' }}>
              Loading…
            </div>
          }>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<Home />} />
              <Route path="/s/:id" element={<Success />} />
              <Route path="/v/:id" element={<ViewSecret />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </ThemeProvider>
  );
};

export default App;