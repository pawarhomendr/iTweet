import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { TrendingPage } from '@/pages/TrendingPage';
import { SearchPage } from '@/pages/SearchPage';
import { BookmarksPage } from '@/pages/BookmarksPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ArticlePage } from '@/pages/ArticlePage';
import { EditorPage } from '@/pages/EditorPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ChatPage } from '@/pages/ChatPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { VerificationApplyPage } from '@/pages/VerificationApplyPage';
import { TermsPage } from '@/pages/TermsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { FeedbackPage } from '@/pages/FeedbackPage';
import { AdminPage } from '@/pages/AdminPage';
import { useAuthStore } from '@/store/auth';
import { useSocketStore } from '@/store/socket';
import { refreshAccessToken } from '@/lib/api';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const { connect, disconnect } = useSocketStore();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const auth = useAuthStore.getState();

      if (!auth.user) {
        if (active) setSessionReady(true);
        return;
      }

      try {
        await refreshAccessToken();
      } catch {
        // Ignore refresh failure and let unauthenticated state render
      } finally {
        if (active) setSessionReady(true);
      }
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
    <ErrorBoundary>
      <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/post/:slug" element={<ArticlePage />} />
            <Route path="/u/:username" element={<ProfilePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route
              path="/write"
              element={isAuthenticated() ? <EditorPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/chat"
              element={isAuthenticated() ? <ChatPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/bookmarks"
              element={isAuthenticated() ? <BookmarksPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/notifications"
              element={isAuthenticated() ? <NotificationsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/settings"
              element={isAuthenticated() ? <SettingsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/verification/apply"
              element={isAuthenticated() ? <VerificationApplyPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/admin"
              element={user ? <AdminPage /> : <Navigate to="/login" replace />}
            />

            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default App;
