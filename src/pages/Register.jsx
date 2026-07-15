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

import { base44 } from '@/api/base44Client';
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