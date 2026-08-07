import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Presentation,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { authProvider } from '@/services/authProvider';
import GoogleIcon from '@/components/GoogleIcon';
import BrandLogo from '@/components/BrandLogo';
import useCurrentUser from '@/hooks/useCurrentUser';

import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SAVED_EMAIL_KEY = 'apresenta_plus_login_email';
const REDIRECT_AFTER_LOGIN_KEY = 'apresenta_redirect_after_login';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail(value),
  );
}

function safeStorageGet(key) {
  if (
    typeof window === 'undefined'
    || !key
  ) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(
      `Não foi possível ler "${key}" do armazenamento:`,
      error,
    );

    return null;
  }
}

function safeStorageSet(key, value) {
  if (
    typeof window === 'undefined'
    || !key
  ) {
    return;
  }

  try {
    if (
      value === undefined
      || value === null
      || String(value).trim() === ''
    ) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(
      key,
      String(value),
    );
  } catch (error) {
    console.warn(
      `Não foi possível salvar "${key}" no armazenamento:`,
      error,
    );
  }
}

function safeSessionGet(key) {
  if (
    typeof window === 'undefined'
    || !key
  ) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch (error) {
    console.warn(
      `Não foi possível ler "${key}" da sessão:`,
      error,
    );

    return null;
  }
}

function safeSessionRemove(key) {
  if (
    typeof window === 'undefined'
    || !key
  ) {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(
      `Não foi possível remover "${key}" da sessão:`,
      error,
    );
  }
}

function isSafeInternalRoute(value) {
  const route = String(value || '').trim();

  if (!route) {
    return false;
  }

  if (!route.startsWith('/')) {
    return false;
  }

  if (route.startsWith('//')) {
    return false;
  }

  if (
    route.startsWith('/login')
    || route.startsWith('/register')
    || route.startsWith('/forgot-password')
    || route.startsWith('/reset-password')
  ) {
    return false;
  }

  return true;
}

function getFriendlyError(error) {
  const status = (
    error?.status
    || error?.response?.status
    || error?.data?.status
  );

  const reason = String(
    error?.type
    || error?.data?.reason
    || error?.data?.extra_data?.reason
    || error?.response?.data?.reason
    || '',
  ).toLowerCase();

  const rawMessage = String(
    error?.message
    || error?.data?.message
    || error?.response?.data?.message
    || '',
  ).toLowerCase();

  if (
    reason === 'user_not_registered'
    || rawMessage.includes('user not registered')
  ) {
    return (
      'Esta conta ainda não foi registrada ou liberada '
      + 'para usar o aplicativo.'
    );
  }

  if (
    reason === 'inactive_account'
    || rawMessage.includes('inactive')
    || rawMessage.includes('disabled')
  ) {
    return (
      'Esta conta está inativa. Entre em contato com o '
      + 'responsável pelo aplicativo.'
    );
  }

  if (
    rawMessage.includes('invalid')
    || rawMessage.includes('credential')
    || rawMessage.includes('password')
    || rawMessage.includes('unauthorized')
    || status === 401
  ) {
    return (
      'E-mail ou senha incorretos. Confira os dados '
      + 'e tente novamente.'
    );
  }

  if (
    rawMessage.includes('not verified')
    || rawMessage.includes('verify')
    || rawMessage.includes('verification')
  ) {
    return (
      'Seu e-mail ainda precisa ser verificado. Confira '
      + 'a mensagem enviada para sua caixa de entrada.'
    );
  }

  if (
    rawMessage.includes('network')
    || rawMessage.includes('fetch')
    || rawMessage.includes('connection')
    || error?.code === 'ERR_NETWORK'
  ) {
    return (
      'Não foi possível conectar ao servidor. Verifique '
      + 'sua internet e tente novamente.'
    );
  }

  if (
    rawMessage.includes('too many')
    || rawMessage.includes('rate limit')
    || status === 429
  ) {
    return (
      'Foram feitas muitas tentativas. Aguarde um pouco '
      + 'antes de tentar novamente.'
    );
  }

  return (
    'Não foi possível entrar agora. Tente novamente '
    + 'em alguns instantes.'
  );
}

async function resolvePostLoginRoute({
  preferredRoute,
} = {}) {
  try {
    const currentUser = await authProvider.me();

    if (!currentUser?.id) {
      return '/';
    }

    const profiles = await base44.entities.UserProfile.filter(
      {
        user_id: currentUser.id,
      },
      '-updated_date',
      1,
    );

    const profile = (
      Array.isArray(profiles)
        ? profiles[0]
        : null
    );

    if (profile?.active === false) {
      return '/login?reason=inactive-account';
    }

    if (
      !profile
      || profile.onboarding_completed !== true
    ) {
      return '/onboarding';
    }

    if (isSafeInternalRoute(preferredRoute)) {
      return preferredRoute;
    }

    return '/';
  } catch (error) {
    console.warn(
      'Não foi possível verificar o onboarding após o login:',
      error,
    );

    if (isSafeInternalRoute(preferredRoute)) {
      return preferredRoute;
    }

    return '/';
  }
}

function LoginBenefits() {
  const items = [
    {
      icon: Sparkles,
      title: 'Criação guiada',
      description:
        'Receba ajuda para transformar uma ideia '
        + 'em uma apresentação forte.',
    },
    {
      icon: Presentation,
      title: 'Apresente sem se perder',
      description:
        'Acompanhe tópico atual, progresso, tempo '
        + 'e próximos assuntos.',
    },
    {
      icon: ShieldCheck,
      title: 'Conteúdo sempre salvo',
      description:
        'Continue seus ensaios e apresentações '
        + 'exatamente de onde parou.',
    },
  ];

  return (
    <div className="hidden min-h-screen w-full max-w-xl flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
      <div>
        <Link
          to="/"
          className="brand-focus inline-flex rounded-2xl transition-opacity hover:opacity-90"
        >
          <BrandLogo
            inverse
            markClassName="h-14 w-14"
            nameClassName="text-xl"
            taglineClassName="text-xs"
          />
        </Link>

        <div className="mt-20 max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            Da ideia ao último tópico
          </p>

          <h2 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">
            Mais clareza para criar. Mais segurança para apresentar.
          </h2>

          <p className="mt-5 text-base leading-relaxed text-primary-foreground/80">
            Construa, reorganize, ensaie e apresente usando
            a mesma estrutura de conteúdo.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map(({
          icon: Icon,
          title,
          description,
        }) => (
          <div
            key={title}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icon
                className="h-5 w-5"
                aria-hidden="true"
              />
            </div>

            <div>
              <p className="font-semibold">
                {title}
              </p>

              <p className="mt-1 text-sm leading-relaxed text-primary-foreground/75">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />

        <p className="text-sm">
          Verificando sua sessão...
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    profile,
    loading: userLoading,
    refreshAuth,
  } = useCurrentUser();

  const redirectHandledRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [
    rememberEmail,
    setRememberEmail,
  ] = useState(true);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] = useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [error, setError] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const requestedRoute = useMemo(() => {
    const routeFromState = location.state?.from;

    if (isSafeInternalRoute(routeFromState)) {
      return routeFromState;
    }

    const routeFromSession = safeSessionGet(
      REDIRECT_AFTER_LOGIN_KEY,
    );

    if (isSafeInternalRoute(routeFromSession)) {
      return routeFromSession;
    }

    return null;
  }, [location.state]);

  useEffect(() => {
    const savedEmail = safeStorageGet(
      SAVED_EMAIL_KEY,
    );

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }

    const query = new URLSearchParams(
      location.search,
    );

    const reason = query.get('reason');

    if (
      reason === 'session-expired'
      || reason === 'session_expired'
    ) {
      setError(
        'Sua sessão expirou. Entre novamente para continuar.',
      );
    }

    if (
      reason === 'registered'
      || reason === 'account-created'
    ) {
      setSuccessMessage(
        'Conta criada com sucesso. Agora você já pode entrar.',
      );
    }

    if (
      reason === 'password-reset'
      || reason === 'password_reset'
    ) {
      setSuccessMessage(
        'Senha atualizada com sucesso. Entre usando sua nova senha.',
      );
    }

    if (
      reason === 'inactive-account'
      || reason === 'inactive_account'
    ) {
      setError(
        'Esta conta está inativa. Entre em contato com o responsável pelo aplicativo.',
      );
    }
  }, [location.search]);

  useEffect(() => {
    if (
      userLoading
      || !user
      || redirectHandledRef.current
    ) {
      return;
    }

    redirectHandledRef.current = true;

    if (
      !profile
      || profile.onboarding_completed !== true
    ) {
      navigate('/onboarding', {
        replace: true,
      });

      return;
    }

    if (profile.active === false) {
      return;
    }

    const destination = (
      requestedRoute
      || '/'
    );

    safeSessionRemove(
      REDIRECT_AFTER_LOGIN_KEY,
    );

    navigate(destination, {
      replace: true,
    });
  }, [
    navigate,
    profile,
    requestedRoute,
    user,
    userLoading,
  ]);

  const canSubmit = useMemo(
    () => (
      isValidEmail(email)
      && password.length > 0
      && !loading
      && !googleLoading
    ),
    [
      email,
      googleLoading,
      loading,
      password.length,
    ],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      loading
      || googleLoading
    ) {
      return;
    }

    setError('');
    setSuccessMessage('');

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      setError(
        'Informe um endereço de e-mail válido.',
      );

      return;
    }

    if (!password) {
      setError('Informe sua senha.');
      return;
    }

    setLoading(true);

    try {
      await authProvider.loginViaEmailPassword(
        normalizedEmail,
        password,
      );

      if (rememberEmail) {
        safeStorageSet(
          SAVED_EMAIL_KEY,
          normalizedEmail,
        );
      } else {
        safeStorageSet(
          SAVED_EMAIL_KEY,
          null,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Atualizar o AuthContext
      |--------------------------------------------------------------------------
      |
      | Caso a sessão do SDK seja atualizada sem exigir recarga completa,
      | o contexto recebe o novo usuário imediatamente.
      |
      */

      try {
        await refreshAuth?.();
      } catch (refreshError) {
        console.warn(
          'A sessão foi criada, mas o contexto não pôde ser atualizado imediatamente:',
          refreshError,
        );
      }

      const targetRoute = await resolvePostLoginRoute({
        preferredRoute: requestedRoute,
      });

      safeSessionRemove(
        REDIRECT_AFTER_LOGIN_KEY,
      );

      /*
      | A autenticação da Base44 pode atualizar credenciais fora do
      | ciclo atual do React. Uma navegação completa garante que o SDK,
      | o AuthProvider e as entidades iniciem com a nova sessão.
      */

      window.location.assign(targetRoute);
    } catch (loginError) {
      console.error(
        'Erro no login:',
        loginError,
      );

      setError(
        getFriendlyError(loginError),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (
      loading
      || googleLoading
    ) {
      return;
    }

    setError('');
    setSuccessMessage('');
    setGoogleLoading(true);

    try {
      const destination = (
        requestedRoute
        || '/'
      );

      if (isSafeInternalRoute(destination)) {
        try {
          window.sessionStorage.setItem(
            REDIRECT_AFTER_LOGIN_KEY,
            destination,
          );
        } catch (storageError) {
          console.warn(
            'Não foi possível salvar o retorno após o Google:',
            storageError,
          );
        }
      }

      const callbackUrl = (
        `${window.location.origin}/login`
      );

      const result = authProvider.loginWithProvider(
        'google',
        callbackUrl,
      );

      /*
      | Algumas versões do SDK retornam uma Promise e outras iniciam
      | o redirecionamento imediatamente.
      */

      if (
        result
        && typeof result.catch === 'function'
      ) {
        result.catch((providerError) => {
          console.error(
            'Erro no login com Google:',
            providerError,
          );

          setGoogleLoading(false);

          setError(
            'Não foi possível iniciar o login com Google.',
          );
        });
      }
    } catch (providerError) {
      console.error(
        'Erro no login com Google:',
        providerError,
      );

      setGoogleLoading(false);

      setError(
        'Não foi possível iniciar o login com Google.',
      );
    }
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);

    if (error) {
      setError('');
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);

    if (error) {
      setError('');
    }
  };

  if (
    userLoading
    && !user
  ) {
    return <LoginLoading />;
  }

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-background lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
      <LoginBenefits />

      <div className="flex min-h-screen min-w-0 items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
        <div className="w-full min-w-0 max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-5 w-fit lg:mx-0">
              <BrandLogo
                compact
                markClassName="h-16 w-16"
              />
            </div>

            <p className="mb-2 text-sm font-semibold text-primary">
              Bem-vindo de volta
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Entre no Apresenta+
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Acesse suas apresentações, ensaios e conteúdos salvos.
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            {successMessage && (
              <Alert className="mb-5 border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />

                <AlertDescription>
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert
                variant="destructive"
                className="mb-5"
              >
                <AlertCircle className="h-4 w-4" />

                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full font-medium"
              onClick={handleGoogle}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-5 w-5" />
              )}

              {googleLoading
                ? 'Abrindo Google...'
                : 'Continuar com Google'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>

              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">
                  ou entre com e-mail
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="login-email">
                  E-mail
                </Label>

                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={handleEmailChange}
                    className="h-12 pl-10"
                    disabled={loading || googleLoading}
                    aria-invalid={
                      Boolean(email)
                      && !isValidEmail(email)
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="login-password">
                    Senha
                  </Label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>

                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={handlePasswordChange}
                    className="h-12 px-10"
                    disabled={loading || googleLoading}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword(
                        (current) => !current,
                      );
                    }}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      showPassword
                        ? 'Ocultar senha'
                        : 'Mostrar senha'
                    }
                    disabled={loading || googleLoading}
                  >
                    {showPassword ? (
                      <EyeOff
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    ) : (
                      <Eye
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-email"
                  checked={rememberEmail}
                  onCheckedChange={(checked) => {
                    setRememberEmail(
                      checked === true,
                    );
                  }}
                  disabled={loading || googleLoading}
                />

                <Label
                  htmlFor="remember-email"
                  className="cursor-pointer text-sm font-normal text-muted-foreground"
                >
                  Lembrar meu e-mail neste dispositivo
                </Label>
              </div>

              <Button
                type="submit"
                className="h-12 w-full font-semibold"
                disabled={!canSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não possui uma conta?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary hover:underline"
            >
              Criar conta gratuitamente
            </Link>
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <Link
              to="/terms"
              className="hover:text-primary hover:underline"
            >
              Termos de Uso
            </Link>

            <span aria-hidden="true">
              •
            </span>

            <Link
              to="/privacy"
              className="hover:text-primary hover:underline"
            >
              Política de Privacidade
            </Link>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Ao entrar, você concorda em usar o aplicativo
            de forma responsável e manter seus dados de
            acesso protegidos.
          </p>
        </div>
      </div>
    </main>
  );
}