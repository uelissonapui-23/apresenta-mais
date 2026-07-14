import React, {
  lazy,
  Suspense,
} from 'react';

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import {
  QueryClientProvider,
} from '@tanstack/react-query';

import { Toaster } from '@/components/ui/toaster';
import { queryClientInstance } from '@/lib/query-client';
import {
  AuthProvider,
} from '@/lib/AuthContext';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import ScrollToTop from '@/components/ScrollToTop';

import AppLayout from '@/components/layout/AppLayout';
import PageNotFound from '@/lib/PageNotFound';

/*
|--------------------------------------------------------------------------
| Carregamento sob demanda
|--------------------------------------------------------------------------
|
| Cada página é carregada somente quando o usuário abre a rota.
| Isso reduz o tamanho inicial do JavaScript e melhora a abertura do app.
|
*/

// Autenticação
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(
  () => import('@/pages/ForgotPassword'),
);
const ResetPassword = lazy(
  () => import('@/pages/ResetPassword'),
);

// Páginas legais
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));

// Primeiro acesso
const Onboarding = lazy(
  () => import('@/pages/Onboarding'),
);

// Aplicativo
const Home = lazy(() => import('@/pages/Home'));
const Presentations = lazy(
  () => import('@/pages/Presentations'),
);
const NewPresentation = lazy(
  () => import('@/pages/NewPresentation'),
);
const GuidedCreation = lazy(
  () => import('@/pages/GuidedCreation'),
);
const PresentationEditor = lazy(
  () => import('@/pages/PresentationEditor'),
);
const PresentationOverview = lazy(
  () => import('@/pages/PresentationOverview'),
);
const Templates = lazy(
  () => import('@/pages/Templates'),
);
const Library = lazy(
  () => import('@/pages/Library'),
);
const ThemesPage = lazy(
  () => import('@/pages/ThemesPage'),
);
const Settings = lazy(
  () => import('@/pages/Settings'),
);
const Profile = lazy(
  () => import('@/pages/Profile'),
);

// Sessões
const Rehearsal = lazy(
  () => import('@/pages/Rehearsal'),
);
const PresentMode = lazy(
  () => import('@/pages/PresentMode'),
);
const SessionHistory = lazy(
  () => import('@/pages/SessionHistory'),
);

// Administração
const AdminDashboard = lazy(
  () => import('@/pages/admin/AdminDashboard'),
);
const AdminUsers = lazy(
  () => import('@/pages/admin/AdminUsers'),
);
const AdminPlans = lazy(
  () => import('@/pages/admin/AdminPlans'),
);
const AdminTypes = lazy(
  () => import('@/pages/admin/AdminTypes'),
);
const AdminObjectives = lazy(
  () => import('@/pages/admin/AdminObjectives'),
);
const AdminStyles = lazy(
  () => import('@/pages/admin/AdminStyles'),
);
const AdminBlockTypes = lazy(
  () => import('@/pages/admin/AdminBlockTypes'),
);
const AdminTemplates = lazy(
  () => import('@/pages/admin/AdminTemplates'),
);
const AdminGuidedFlows = lazy(
  () => import('@/pages/admin/AdminGuidedFlows'),
);
const AdminQuestions = lazy(
  () => import('@/pages/admin/AdminQuestions'),
);
const AdminThemes = lazy(
  () => import('@/pages/admin/AdminThemes'),
);
const AdminTips = lazy(
  () => import('@/pages/admin/AdminTips'),
);

/*
|--------------------------------------------------------------------------
| Tela de carregamento
|--------------------------------------------------------------------------
*/

function AppLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />

          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />

          <div className="h-4 w-4 rounded-full bg-primary" />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium">
            Apresenta+
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Preparando sua experiência...
          </p>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Redirecionamento de rotas antigas
|--------------------------------------------------------------------------
|
| Durante a estruturação, algumas páginas podem ter recebido links antigos.
| Estas rotas mantêm compatibilidade sem quebrar a navegação.
|
*/

function LegacyEditorRedirect() {
  const location = useLocation();
  const id = location.pathname
    .replace('/presentation-editor/', '')
    .replaceAll('/', '');

  if (!id) {
    return (
      <Navigate
        to="/presentations"
        replace
      />
    );
  }

  return (
    <Navigate
      to={`/presentations/${id}/editor`}
      replace
    />
  );
}

function LegacyOverviewRedirect() {
  const location = useLocation();
  const id = location.pathname
    .replace('/presentation-overview/', '')
    .replaceAll('/', '');

  if (!id) {
    return (
      <Navigate
        to="/presentations"
        replace
      />
    );
  }

  return (
    <Navigate
      to={`/presentations/${id}/overview`}
      replace
    />
  );
}

/*
|--------------------------------------------------------------------------
| Rotas
|--------------------------------------------------------------------------
*/

function AppRoutes() {
  return (
    <Suspense fallback={<AppLoading />}>
      <Routes>
        {/*
        |--------------------------------------------------------------------------
        | Rotas públicas
        |--------------------------------------------------------------------------
        */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/terms"
          element={<Terms />}
        />

        <Route
          path="/privacy"
          element={<Privacy />}
        />

        {/*
        |--------------------------------------------------------------------------
        | Rotas protegidas
        |--------------------------------------------------------------------------
        */}

        <Route
          element={(
            <ProtectedRoute
              unauthenticatedElement={(
                <Navigate
                  to="/login"
                  replace
                />
              )}
            />
          )}
        >
          {/*
          |--------------------------------------------------------------------------
          | Primeiro acesso
          |--------------------------------------------------------------------------
          |
          | Fica fora do layout principal para manter a tela limpa.
          |
          */}

          <Route
            path="/onboarding"
            element={<Onboarding />}
          />

          {/*
          |--------------------------------------------------------------------------
          | Modos de sessão
          |--------------------------------------------------------------------------
          |
          | Ensaio e apresentação ficam fora do layout comum.
          |
          */}

          <Route
            path="/rehearsal/:id"
            element={<Rehearsal />}
          />

          <Route
            path="/present/:id"
            element={<PresentMode />}
          />

          {/*
          |--------------------------------------------------------------------------
          | Aplicativo com layout principal
          |--------------------------------------------------------------------------
          */}

          <Route element={<AppLayout />}>
            <Route
              index
              element={<Home />}
            />

            <Route
              path="/presentations"
              element={<Presentations />}
            />

            <Route
              path="/new-presentation"
              element={<NewPresentation />}
            />

            <Route
              path="/guided/:id"
              element={<GuidedCreation />}
            />

            <Route
              path="/presentations/:id/editor"
              element={<PresentationEditor />}
            />

            <Route
              path="/presentations/:id/overview"
              element={<PresentationOverview />}
            />

            <Route
              path="/session-history/:id"
              element={<SessionHistory />}
            />

            <Route
              path="/templates"
              element={<Templates />}
            />

            <Route
              path="/library"
              element={<Library />}
            />

            <Route
              path="/themes"
              element={<ThemesPage />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

            <Route
              path="/profile"
              element={<Profile />}
            />

            {/*
            |--------------------------------------------------------------------------
            | Compatibilidade com links antigos
            |--------------------------------------------------------------------------
            */}

            <Route
              path="/presentation-editor/:id"
              element={<LegacyEditorRedirect />}
            />

            <Route
              path="/presentation-overview/:id"
              element={<LegacyOverviewRedirect />}
            />

            {/*
            |--------------------------------------------------------------------------
            | Administração
            |--------------------------------------------------------------------------
            */}

            <Route element={<AdminRoute />}>
              <Route
                path="/admin"
                element={<AdminDashboard />}
              />

              <Route
                path="/admin/users"
                element={<AdminUsers />}
              />

              <Route
                path="/admin/plans"
                element={<AdminPlans />}
              />

              <Route
                path="/admin/types"
                element={<AdminTypes />}
              />

              <Route
                path="/admin/objectives"
                element={<AdminObjectives />}
              />

              <Route
                path="/admin/styles"
                element={<AdminStyles />}
              />

              <Route
                path="/admin/block-types"
                element={<AdminBlockTypes />}
              />

              <Route
                path="/admin/templates"
                element={<AdminTemplates />}
              />

              <Route
                path="/admin/guided-flows"
                element={<AdminGuidedFlows />}
              />

              <Route
                path="/admin/guided-questions"
                element={<AdminQuestions />}
              />

              <Route
                path="/admin/themes"
                element={<AdminThemes />}
              />

              <Route
                path="/admin/tips"
                element={<AdminTips />}
              />
            </Route>
          </Route>
        </Route>

        {/*
        |--------------------------------------------------------------------------
        | Página não encontrada
        |--------------------------------------------------------------------------
        |
        | Deve permanecer sempre como a última rota.
        |
        */}

        <Route
          path="*"
          element={<PageNotFound />}
        />
      </Routes>
    </Suspense>
  );
}

/*
|--------------------------------------------------------------------------
| Aplicativo principal
|--------------------------------------------------------------------------
*/

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />

          <AppRoutes />
        </BrowserRouter>

        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}