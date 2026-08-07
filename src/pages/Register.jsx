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
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Presentation,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';

import { authProvider } from '@/services/authProvider';
import AuthLayout from '@/components/AuthLayout';
import GoogleIcon from '@/components/GoogleIcon';
import useCurrentUser from '@/hooks/useCurrentUser';

import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';

const REGISTER_EMAIL_KEY = 'apresenta_plus_register_email';
const REDIRECT_AFTER_LOGIN_KEY = 'apresenta_redirect_after_login';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 45;

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

function safeSessionSet(key, value) {
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
      window.sessionStorage.removeItem(key);
      return;
    }

    window.sessionStorage.setItem(
      key,
      String(value),
    );
  } catch (error) {
    console.warn(
      `Não foi possível salvar "${key}" na sessão:`,
      error,
    );
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

  if (!route || !route.startsWith('/')) {
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

function getPasswordChecks(password) {
  const value = String(password || '');

  return {
    length: value.length >= 8,
    uppercase: /[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]/.test(value),
    lowercase: /[a-záàâãéèêíïóôõöúç]/.test(value),
    number: /\d/.test(value),
  };
}

function getPasswordStrength(password) {
  const checks = getPasswordChecks(password);

  const score = Object.values(checks).filter(Boolean).length;

  if (!password) {
    return {
      score: 0,
      percentage: 0,
      label: 'Ainda não informada',
      className: 'text-muted-foreground',
    };
  }

  if (score <= 1) {
    return {
      score,
      percentage: 25,
      label: 'Fraca',
      className: 'text-destructive',
    };
  }

  if (score === 2) {
    return {
      score,
      percentage: 50,
      label: 'Razoável',
      className:
        'text-amber-600 dark:text-amber-400',
    };
  }

  if (score === 3) {
    return {
      score,
      percentage: 75,
      label: 'Boa',
      className:
        'text-blue-600 dark:text-blue-400',
    };
  }

  return {
    score,
    percentage: 100,
    label: 'Forte',
    className:
      'text-emerald-600 dark:text-emerald-400',
  };
}

function isStrongEnough(password) {
  return Object
    .values(getPasswordChecks(password))
    .every(Boolean);
}

function getErrorStatus(error) {
  return (
    error?.status
    || error?.response?.status
    || error?.data?.status
    || null
  );
}

function getErrorMessage(error) {
  return String(
    error?.message
    || error?.data?.message
    || error?.response?.data?.message
    || '',
  ).toLowerCase();
}

function getFriendlyRegisterError(error) {
  const rawMessage = getErrorMessage(error);
  const status = getErrorStatus(error);

  if (
    rawMessage.includes('already')
    || rawMessage.includes('exists')
    || rawMessage.includes('registered')
    || rawMessage.includes('duplicate')
    || status === 409
  ) {
    return (
      'Já existe uma conta cadastrada com este e-mail. '
      + 'Entre na sua conta ou recupere a senha.'
    );
  }

  if (
    rawMessage.includes('password')
    || rawMessage.includes('weak')
  ) {
    return (
      'A senha não atende aos requisitos de segurança. '
      + 'Use pelo menos 8 caracteres, com letra maiúscula, '
      + 'letra minúscula e número.'
    );
  }

  if (
    rawMessage.includes('invalid email')
    || rawMessage.includes('email is invalid')
  ) {
    return 'O endereço de e-mail informado não é válido.';
  }

  if (
    rawMessage.includes('network')
    || rawMessage.includes('fetch')
    || rawMessage.includes('connection')
    || error?.code === 'ERR_NETWORK'
  ) {
    return (
      'Não foi possível conectar ao servidor. '
      + 'Verifique sua internet e tente novamente.'
    );
  }

  if (
    rawMessage.includes('too many')
    || rawMessage.includes('rate limit')
    || status === 429
  ) {
    return (
      'Foram feitas muitas tentativas. '
      + 'Aguarde um pouco antes de tentar novamente.'
    );
  }

  return (
    'Não foi possível criar sua conta agora. '
    + 'Tente novamente em alguns instantes.'
  );
}

function getFriendlyOtpError(error) {
  const rawMessage = getErrorMessage(error);
  const status = getErrorStatus(error);

  if (
    rawMessage.includes('expired')
    || rawMessage.includes('expire')
  ) {
    return (
      'Este código expirou. Solicite um novo código '
      + 'e tente novamente.'
    );
  }

  if (
    rawMessage.includes('invalid')
    || rawMessage.includes('incorrect')
    || rawMessage.includes('otp')
    || status === 400
    || status === 401
  ) {
    return (
      'O código informado está incorreto. '
      + 'Confira o e-mail e tente novamente.'
    );
  }

  if (
    rawMessage.includes('network')
    || rawMessage.includes('fetch')
    || rawMessage.includes('connection')
    || error?.code === 'ERR_NETWORK'
  ) {
    return (
      'Não foi possível verificar o código. '
      + 'Confira sua internet e tente novamente.'
    );
  }

  if (
    rawMessage.includes('too many')
    || rawMessage.includes('rate limit')
    || status === 429
  ) {
    return (
      'Foram feitas muitas tentativas. '
      + 'Aguarde antes de informar outro código.'
    );
  }

  return (
    'Não foi possível verificar seu e-mail agora. '
    + 'Tente novamente.'
  );
}

function PasswordRequirement({
  valid,
  children,
}) {
  return (
    <li
      className={`flex items-center gap-2 text-xs ${
        valid
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-muted-foreground'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          valid
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-border bg-background'
        }`}
      >
        {valid && (
          <Check
            className="h-3 w-3"
            aria-hidden="true"
          />
        )}
      </span>

      {children}
    </li>
  );
}

function RegisterBenefits() {
  const benefits = [
    {
      icon: Sparkles,
      title: 'Comece mesmo sem experiência',
      description:
        'A criação guiada ajuda você a transformar '
        + 'um tema em uma apresentação bem estruturada.',
    },
    {
      icon: Presentation,
      title: 'Organize tudo com facilidade',
      description:
        'Mova tópicos, altere a ordem e escolha quanto '
        + 'conteúdo deseja visualizar.',
    },
    {
      icon: ShieldCheck,
      title: 'Apresente com segurança',
      description:
        'Acompanhe o progresso, o tempo e os assuntos '
        + 'já apresentados sem se perder.',
    },
  ];

  return (
    <div className="hidden min-h-screen w-full max-w-xl flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Presentation
              className="h-6 w-6"
              aria-hidden="true"
            />
          </div>

          <div>
            <p className="text-xl font-bold">
              Apresenta+
            </p>

            <p className="text-sm text-primary-foreground/70">
              Da primeira ideia ao último tópico.
            </p>
          </div>
        </Link>

        <div className="mt-20 max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            Sua mensagem merece clareza
          </p>

          <h2 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">
            Crie apresentações fortes sem começar de uma página em branco.
          </h2>

          <p className="mt-5 text-base leading-relaxed text-primary-foreground/80">
            O aplicativo acompanha você na construção,
            no ensaio e no momento de apresentar.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {benefits.map(({
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

function RegisterLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />

        <p className="text-sm">
          Verificando sua conta...
        </p>
      </div>
    </div>
  );
}

function VerificationStep({
  email,
  otpCode,
  setOtpCode,
  error,
  verifying,
  resending,
  resendSeconds,
  onVerify,
  onResend,
  onBack,
}) {
  return (
    <AuthLayout
      icon={Mail}
      title="Confirme seu e-mail"
      subtitle={`Enviamos um código de ${OTP_LENGTH} dígitos para ${email}`}
      footer={(
        <span>
          Já possui uma conta?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Entrar
          </Link>
        </span>
      )}
    >
      <div className="space-y-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={onBack}
          disabled={verifying || resending}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Corrigir e-mail
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />

            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Confira também:
          </p>

          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              A caixa de spam ou lixo eletrônico.
            </li>

            <li>
              Se o endereço de e-mail foi digitado corretamente.
            </li>

            <li>
              O código mais recente, caso tenha solicitado outro.
            </li>
          </ul>
        </div>

        <form
          onSubmit={onVerify}
          className="space-y-6"
        >
          <div className="space-y-3">
            <Label className="block text-center">
              Código de verificação
            </Label>

            <div className="flex justify-center overflow-x-auto pb-1">
              <InputOTP
                maxLength={OTP_LENGTH}
                value={otpCode}
                onChange={(value) => {
                  setOtpCode(
                    value.replace(/\D/g, ''),
                  );
                }}
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={verifying || resending}
              >
                <InputOTPGroup>
                  {Array
                    .from({
                      length: OTP_LENGTH,
                    })
                    .map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                      />
                    ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full font-semibold"
            disabled={
              verifying
              || resending
              || otpCode.length !== OTP_LENGTH
            }
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar e continuar
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Não recebeu o código?{' '}

          <button
            type="button"
            onClick={onResend}
            disabled={
              verifying
              || resending
              || resendSeconds > 0
            }
            className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending
              ? 'Enviando...'
              : resendSeconds > 0
                ? `Reenviar em ${resendSeconds}s`
                : 'Reenviar código'}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const {
    user,
    profile,
    loading: userLoading,
    refreshAuth,
  } = useCurrentUser();

  const redirectHandledRef = useRef(false);

  const [step, setStep] = useState('register');

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [otpCode, setOtpCode] = useState('');

  const [acceptTerms, setAcceptTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const [resendSeconds, setResendSeconds] = useState(0);

  const [error, setError] = useState('');

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

  const normalizedEmail = useMemo(
    () => normalizeEmail(form.email),
    [form.email],
  );

  const passwordChecks = useMemo(
    () => getPasswordChecks(form.password),
    [form.password],
  );

  const passwordStrength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password],
  );

  const passwordsMatch = (
    Boolean(form.confirmPassword)
    && form.password === form.confirmPassword
  );

  const canSubmit = useMemo(
    () => (
      isValidEmail(normalizedEmail)
      && isStrongEnough(form.password)
      && passwordsMatch
      && acceptTerms
      && !submitting
      && !googleLoading
    ),
    [
      acceptTerms,
      form.password,
      googleLoading,
      normalizedEmail,
      passwordsMatch,
      submitting,
    ],
  );

  useEffect(() => {
    const savedEmail = safeSessionGet(
      REGISTER_EMAIL_KEY,
    );

    if (savedEmail) {
      setForm((current) => ({
        ...current,
        email: savedEmail,
      }));
    }
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setResendSeconds((current) => (
        Math.max(0, current - 1)
      ));
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [resendSeconds]);

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

    safeSessionRemove(
      REDIRECT_AFTER_LOGIN_KEY,
    );

    navigate(
      requestedRoute || '/',
      {
        replace: true,
      },
    );
  }, [
    navigate,
    profile,
    requestedRoute,
    user,
    userLoading,
  ]);

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;

    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError('');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    if (
      submitting
      || googleLoading
    ) {
      return;
    }

    setError('');

    if (!isValidEmail(normalizedEmail)) {
      setError(
        'Informe um endereço de e-mail válido.',
      );

      return;
    }

    if (!isStrongEnough(form.password)) {
      setError(
        'A senha precisa ter pelo menos 8 caracteres, '
        + 'letra maiúscula, letra minúscula e número.',
      );

      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(
        'A confirmação da senha não corresponde.',
      );

      return;
    }

    if (!acceptTerms) {
      setError(
        'Leia e aceite os Termos de Uso e a Política de Privacidade.',
      );

      return;
    }

    setSubmitting(true);

    try {
      const result = await authProvider.register({
        email: normalizedEmail,
        password: form.password,
      });

      safeSessionSet(
        REGISTER_EMAIL_KEY,
        normalizedEmail,
      );

      /*
      |--------------------------------------------------------------------------
      | Algumas versões do SDK podem concluir o cadastro sem exigir OTP
      |--------------------------------------------------------------------------
      */

      const hasActiveSession = Boolean(result?.session);
      const verificationRequired = Boolean(
        result?.requires_verification
        || result?.verification_required,
      );

      /*
      |--------------------------------------------------------------------------
      | Cadastro simples: quando o Supabase está com “Confirm email” desligado,
      | signUp já devolve uma sessão. Não fazemos um segundo login aqui, pois isso
      | evita corrida de sessão e mensagens falsas de senha inválida logo após o
      | cadastro.
      |--------------------------------------------------------------------------
      */
      if (hasActiveSession && !verificationRequired) {
        try {
          await refreshAuth?.();
        } catch (refreshError) {
          console.warn(
            'A conta foi criada, mas o contexto não pôde ser atualizado imediatamente:',
            refreshError,
          );
        }

        safeSessionRemove(REGISTER_EMAIL_KEY);

        toast({
          title: 'Conta criada',
          description: 'Seu cadastro foi concluído com sucesso.',
        });

        window.location.assign('/onboarding');
        return;
      }

      /*
      | Mantemos compatibilidade com confirmação por OTP para o futuro. Quando
      | um SMTP próprio for configurado e “Confirm email” for reativado, esta
      | mesma tela volta a funcionar sem outra migração.
      */
      setOtpCode('');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setStep('verification');

      toast({
        title: 'Confirmação necessária',
        description:
          'A conta foi criada e está aguardando a confirmação do e-mail.',
      });
    } catch (registerError) {
      console.error(
        'Erro ao criar conta:',
        registerError,
      );

      setError(
        getFriendlyRegisterError(registerError),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (
      verifying
      || resending
    ) {
      return;
    }

    setError('');

    if (otpCode.length !== OTP_LENGTH) {
      setError(
        `Informe o código de ${OTP_LENGTH} dígitos.`,
      );

      return;
    }

    setVerifying(true);

    try {
      await authProvider.verifyOtp({
        email: normalizedEmail,
        otp: otpCode,
        code: otpCode,
      });

      /*
      |--------------------------------------------------------------------------
      | Entrar automaticamente depois da confirmação
      |--------------------------------------------------------------------------
      */

      await authProvider.loginViaEmailPassword(
        normalizedEmail,
        form.password,
      );

      try {
        await refreshAuth?.();
      } catch (refreshError) {
        console.warn(
          'O e-mail foi confirmado, mas o contexto não pôde ser atualizado imediatamente:',
          refreshError,
        );
      }

      safeSessionRemove(
        REGISTER_EMAIL_KEY,
      );

      const destination = '/onboarding';

      window.location.assign(destination);
    } catch (verificationError) {
      console.error(
        'Erro ao verificar código:',
        verificationError,
      );

      setError(
        getFriendlyOtpError(verificationError),
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (
      resending
      || verifying
      || resendSeconds > 0
    ) {
      return;
    }

    setError('');
    setResending(true);

    try {
      await authProvider.resendOtp({
        email: normalizedEmail,
      });

      setOtpCode('');
      setResendSeconds(
        RESEND_COOLDOWN_SECONDS,
      );

      toast({
        title: 'Novo código enviado',
        description:
          'Use somente o código mais recente recebido por e-mail.',
      });
    } catch (resendError) {
      console.error(
        'Erro ao reenviar código:',
        resendError,
      );

      setError(
        getFriendlyOtpError(resendError),
      );
    } finally {
      setResending(false);
    }
  };

  const handleBackToRegister = () => {
    if (
      verifying
      || resending
    ) {
      return;
    }

    setStep('register');
    setOtpCode('');
    setError('');
  };

  const handleGoogle = () => {
    if (
      submitting
      || googleLoading
    ) {
      return;
    }

    setError('');
    setGoogleLoading(true);

    try {
      const destination = (
        requestedRoute
        || '/onboarding'
      );

      if (isSafeInternalRoute(destination)) {
        safeSessionSet(
          REDIRECT_AFTER_LOGIN_KEY,
          destination,
        );
      }

      const callbackUrl = (
        `${window.location.origin}/login`
      );

      const result = authProvider.loginWithProvider(
        'google',
        callbackUrl,
      );

      if (
        result
        && typeof result.catch === 'function'
      ) {
        result.catch((providerError) => {
          console.error(
            'Erro no cadastro com Google:',
            providerError,
          );

          setGoogleLoading(false);

          setError(
            'Não foi possível iniciar o cadastro com Google.',
          );
        });
      }
    } catch (providerError) {
      console.error(
        'Erro no cadastro com Google:',
        providerError,
      );

      setGoogleLoading(false);

      setError(
        'Não foi possível iniciar o cadastro com Google.',
      );
    }
  };

  if (
    userLoading
    && !user
  ) {
    return <RegisterLoading />;
  }

  if (step === 'verification') {
    return (
      <VerificationStep
        email={normalizedEmail}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        error={error}
        verifying={verifying}
        resending={resending}
        resendSeconds={resendSeconds}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onBack={handleBackToRegister}
      />
    );
  }

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-background lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
      <RegisterBenefits />

      <div className="flex min-h-screen min-w-0 items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
        <div className="w-full min-w-0 max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary lg:mx-0">
              <UserPlus
                className="h-7 w-7 text-primary-foreground"
                aria-hidden="true"
              />
            </div>

            <p className="mb-2 text-sm font-semibold text-primary">
              Comece gratuitamente
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Crie sua conta
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Organize suas ideias e prepare apresentações
              com mais clareza e segurança.
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
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
              disabled={submitting || googleLoading}
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
                  ou cadastre com e-mail
                </span>
              </div>
            </div>

            <form
              onSubmit={handleRegister}
              noValidate
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="register-email">
                  E-mail
                </Label>

                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id="register-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    placeholder="seuemail@exemplo.com"
                    value={form.email}
                    onChange={handleFieldChange('email')}
                    className="h-12 pl-10"
                    disabled={submitting || googleLoading}
                    aria-invalid={
                      Boolean(form.email)
                      && !isValidEmail(form.email)
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">
                  Senha
                </Label>

                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Crie uma senha segura"
                    value={form.password}
                    onChange={handleFieldChange('password')}
                    className="h-12 px-10"
                    disabled={submitting || googleLoading}
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
                    disabled={submitting || googleLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="rounded-xl border bg-muted/25 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium">
                      Força da senha
                    </p>

                    <p
                      className={`text-xs font-semibold ${passwordStrength.className}`}
                    >
                      {passwordStrength.label}
                    </p>
                  </div>

                  <Progress
                    value={passwordStrength.percentage}
                    className="mt-2 h-2"
                  />

                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    <PasswordRequirement
                      valid={passwordChecks.length}
                    >
                      8 caracteres
                    </PasswordRequirement>

                    <PasswordRequirement
                      valid={passwordChecks.uppercase}
                    >
                      Letra maiúscula
                    </PasswordRequirement>

                    <PasswordRequirement
                      valid={passwordChecks.lowercase}
                    >
                      Letra minúscula
                    </PasswordRequirement>

                    <PasswordRequirement
                      valid={passwordChecks.number}
                    >
                      Número
                    </PasswordRequirement>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">
                  Confirmar senha
                </Label>

                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id="register-confirm-password"
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="new-password"
                    placeholder="Digite novamente"
                    value={form.confirmPassword}
                    onChange={handleFieldChange('confirmPassword')}
                    className="h-12 px-10"
                    disabled={submitting || googleLoading}
                    aria-invalid={
                      Boolean(form.confirmPassword)
                      && !passwordsMatch
                    }
                    required
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmPassword(
                        (current) => !current,
                      );
                    }}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      showConfirmPassword
                        ? 'Ocultar confirmação'
                        : 'Mostrar confirmação'
                    }
                    disabled={submitting || googleLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {form.confirmPassword && (
                  <p
                    className={`text-xs ${
                      passwordsMatch
                        ? 'text-emerald-600'
                        : 'text-destructive'
                    }`}
                  >
                    {passwordsMatch
                      ? 'As senhas são iguais.'
                      : 'As senhas não correspondem.'}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl border p-3">
                <Checkbox
                  id="accept-terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => {
                    setAcceptTerms(
                      checked === true,
                    );

                    if (error) {
                      setError('');
                    }
                  }}
                  disabled={submitting || googleLoading}
                  className="mt-0.5"
                />

                <Label
                  htmlFor="accept-terms"
                  className="cursor-pointer text-sm font-normal leading-6 text-muted-foreground"
                >
                  Li e aceito os{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Política de Privacidade
                  </Link>.
                </Label>
              </div>

              <Button
                type="submit"
                className="h-12 w-full font-semibold"
                disabled={!canSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    Criar minha conta
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já possui uma conta?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary hover:underline"
            >
              Entrar
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
        </div>
      </div>
    </main>
  );
}