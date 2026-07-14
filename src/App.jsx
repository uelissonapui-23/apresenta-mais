import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Public legal pages
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';

// Layout
import AppLayout from '@/components/layout/AppLayout';
import AdminRoute from '@/components/AdminRoute';

// Pages
import Home from '@/pages/Home';
import Presentations from '@/pages/Presentations';
import NewPresentation from '@/pages/NewPresentation';
import PresentationEditor from '@/pages/PresentationEditor';
import PresentationOverview from '@/pages/PresentationOverview';
import GuidedCreation from '@/pages/GuidedCreation';
import Templates from '@/pages/Templates';
import Library from '@/pages/Library';
import Rehearsal from '@/pages/Rehearsal';
import PresentMode from '@/pages/PresentMode';
import SessionHistory from '@/pages/SessionHistory';
import ThemesPage from '@/pages/ThemesPage';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Onboarding from '@/pages/Onboarding';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminPlans from '@/pages/admin/AdminPlans';
import AdminTypes from '@/pages/admin/AdminTypes';
import AdminObjectives from '@/pages/admin/AdminObjectives';
import AdminStyles from '@/pages/admin/AdminStyles';
import AdminBlockTypes from '@/pages/admin/AdminBlockTypes';
import AdminTemplates from '@/pages/admin/AdminTemplates';
import AdminGuidedFlows from '@/pages/admin/AdminGuidedFlows';
import AdminQuestions from '@/pages/admin/AdminQuestions';
import AdminThemes from '@/pages/admin/AdminThemes';
import AdminTips from '@/pages/admin/AdminTips';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public routes - no auth required */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* Onboarding - no layout */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Presentation mode - no layout (full screen) */}
        <Route path="/present/:id" element={<PresentMode />} />

        {/* Rehearsal - no layout */}
        <Route path="/rehearsal/:id" element={<Rehearsal />} />

        {/* Main app with layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/presentations" element={<Presentations />} />
          <Route path="/new-presentation" element={<NewPresentation />} />
          <Route path="/presentations/:id/editor" element={<PresentationEditor />} />
          <Route path="/presentations/:id/overview" element={<PresentationOverview />} />
          <Route path="/guided/:id" element={<GuidedCreation />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/library" element={<Library />} />
          <Route path="/session-history/:id" element={<SessionHistory />} />
          <Route path="/themes" element={<ThemesPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />

          {/* Admin routes - protected by AdminRoute */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/types" element={<AdminTypes />} />
            <Route path="/admin/objectives" element={<AdminObjectives />} />
            <Route path="/admin/styles" element={<AdminStyles />} />
            <Route path="/admin/block-types" element={<AdminBlockTypes />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="/admin/guided-flows" element={<AdminGuidedFlows />} />
            <Route path="/admin/guided-questions" element={<AdminQuestions />} />
            <Route path="/admin/themes" element={<AdminThemes />} />
            <Route path="/admin/tips" element={<AdminTips />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App