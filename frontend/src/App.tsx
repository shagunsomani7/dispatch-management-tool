import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './components/Dashboard';
import SlabEntry from './components/forms/SlabEntry';
import SlabList from './components/pages/SlabList';
import Reports from './components/reports/Reports';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/entry" element={<SlabEntry />} />
          <Route path="/slabs" element={<SlabList />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 