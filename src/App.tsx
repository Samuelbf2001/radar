import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const Dashboard      = lazy(() => import('./pages/Dashboard'));
const EntregableView = lazy(() => import('./pages/EntregableView'));

const Loader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}>
    <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #1f6feb', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/"                 element={<Dashboard />} />
          <Route path="/entregable/:slug" element={<EntregableView />} />
          <Route path="*"                 element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
