/**
 * Routes. Two pages: the home page and the builder behind the code.
 * Anything else goes home.
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import Create from './pages/Create';
import Home from './pages/Home';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Create />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
