
import React, { useEffect, useState } from 'react';
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
import { refreshAccessToken } from '@/lib/api';

export const App: React.FC = () => {
  const { isAuthenticated, isMod, user } = useAuthStore();
  const { connect, disconnect } = useSocketStore();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const auth = useAuthStore.getState();

      if (auth.getToken()) {
        if (active) setSessionReady(true);
        return;
      }

      if (!auth.user) {
        if (active) setSessionReady(true);
        return;
      }

      await refreshAccessToken();

      if (active) setSessionReady(true);
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    if (isAuthenticated()) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [sessionReady, user, connect, disconnect, isAuthenticated]);

  if (!sessionReady) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p>Restoring session...</p>
      </div>
    );
  }

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
          <Route
            path="/admin"
            element={isAuthenticated() && isMod() ? <AdminPage /> : <Navigate to="/" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
