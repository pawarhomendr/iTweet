import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { ArticlePage } from '@/pages/ArticlePage';
import { EditorPage } from '@/pages/EditorPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ChatPage } from '@/pages/ChatPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { VerificationApplyPage } from '@/pages/VerificationApplyPage';
import { FeedbackPage } from '@/pages/FeedbackPage';
import { AdminPage } from '@/pages/AdminPage';
import { useAuthStore } from '@/store/auth';
import { useSocketStore } from '@/store/socket';

export const App: React.FC = () => {
  const { isAuthenticated, isMod, setToken, setUser, logout, user } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  // FIX S-2: On page load, silently refresh the in-memory access token using
  // the httpOnly refresh cookie. Token is never stored in localStorage.
  useEffect(() => {
    if (user && !isAuthenticated()) {
      // We have a persisted user profile but no in-memory token — attempt silent refresh
      import('@/lib/api').then(({ api }) => {
        api.post('/auth/refresh')
          .then((r) => {
            setToken(r.data.data.token);
          })
          .catch(() => {
            // Refresh cookie expired or invalid — clear stale user profile
            logout();
          });
      });
    }
  }, []); // run once on mount

  useEffect(() => {
    if (isAuthenticated()) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated()]);

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/trending" element={<HomePage />} />
          <Route path="/post/:slug" element={<ArticlePage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/write"
            element={isAuthenticated() ? <EditorPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/chat"
            element={isAuthenticated() ? <ChatPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/verification/apply"
            element={isAuthenticated() ? <VerificationApplyPage /> : <Navigate to="/login" replace />}
          />

          {/* Moderator / Admin Routes */}
          <Route
            path="/admin"
            element={isMod() ? <AdminPage /> : <Navigate to="/" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
