/**
 * Routes.
 *
 * /b/:id is deliberately outside the normal layout: the recipient view is a
 * gift, not a page of the website.
 */

import { Route, Routes } from 'react-router-dom';
import ThemeProvider from './lib/ThemeProvider';
import Garden from './pages/Garden';
import Landing from './pages/Landing';
import LettersPage from './pages/LettersPage';
import NotFound from './pages/NotFound';
import OccasionPage from './pages/OccasionPage';
import Recipient from './pages/Recipient';

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/garden" element={<Garden />} />
        <Route path="/letters" element={<LettersPage />} />
        <Route path="/occasion/:slug" element={<OccasionPage />} />
        <Route path="/b/:id" element={<Recipient />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  );
}
