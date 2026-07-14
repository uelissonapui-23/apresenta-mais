import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RESEND_SECONDS = 45;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function getFriendlyError(error) {
  const rawMessage = String(
    error?.message || error?.response?.data?.message || error || '',
  ).toLowerCase();

  if (
    rawMessage.includes('network')
    || rawMessage.includes('fetch')
    || rawMessage.includes('connection')
  ) {
    return 'Não foi possível conectar ao servidor. Confira sua internet e tente novamente.';
  }

  if (
    rawMessage.includes('too many')
    || rawMessage.includes('rate limit')
    || rawMessage.includes('limit exceeded')
  ) {
    return 'Foram feitas muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  }

  return 'Não foi possível enviar a solicitação agora. Tente novamente em alguns instantes.';
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm">Verificando sua sessão...</p>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const emailFromLocation = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return normalizeEmail(search.get('email'));
  }, [location.search]);

  const [email, setEmail] = useState(emailFromLocation);
  const [fieldError, setFieldError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const currentUser = await base44.auth.me();

        if (active && currentUser?.id) {
          navigate('/', { replace: true });
          return;
        }
      } catch {
        // Usuário não autenticado: permanece na recuperação de senha.
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const validate = () => {
    const normalized = normalizeEmail(email);

    if (!normalized) {
      setFieldError('Informe o e-mail usado na sua conta.');
      return false;
    }

    if (!isValidEmail(normalized)) {
      setFieldError('Digite um endereço de e-mail válido.');
      return false;
    }

    setFieldError('');
    return true;
  };

  const sendResetRequest = async (targetEmail) => {
    setLoading(true);
    setRequestError('');

    try {
      await base44.auth.resetPasswordRequest(targetEmail);

      setSentEmail(targetEmail);
      setSent(true);
      setResendSeconds(RESEND_SECONDS);
    } catch (error) {
      console.error('Erro ao solicitar redefinição de senha:', error);

      const friendlyError = getFriendlyError(error);

      // Por privacidade, erros que possam revelar se a conta existe
      // são tratados como sucesso. Apenas falhas operacionais claras
      // são exibidas ao usuário.
      const rawMessage = String(error?.message || error || '').toLowerCase();
      const operationalFailure = (
        rawMessage.includes('network')
        || rawMessage.includes('fetch')
        || rawMessage.includes('connection')
        || rawMessage.includes('too many')
        || rawMessage.includes('rate limit')
        || rawMessage.includes('limit exceeded')
      );

      if (operationalFailure) {
        setRequestError(friendlyError);
      } else {
        setSentEmail(targetEmail);
        setSent(true);
        setResendSeconds(RESEND_SECONDS);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || !validate()) {
      return;
    }

    const normalized = normalizeEmail(email);
    setEmail(normalized);
    await sendResetRequest(normalized);
  };

  const handleResend = async () => {
    if (loading || resendSeconds > 0 || !sentEmail) {
      return;
    }

    await sendResetRequest(sentEmail);
  };

  const handleChangeEmail = () => {
    setSent(false);
    setRequestError('');
    setFieldError('');
    setResendSeconds(0);
  };

  if (checkingSession) {
    return <AuthLoading />;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)]">
        <section className="relative hidden overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-15">
            <div className="absolute -left-28 -top-24 h-80 w-80 rounded-full border border-current" />
            <div className="absolute -bottom-40 -right-28 h-96 w-96 rounded-full border border-current" />
            <div className="absolute left-1/3 top-1/3 h-36 w-36 rounded-full bg-current blur-3xl" />
          </div>

          <div className="relative z-10">
            <Link to="/login" className="inline-flex items-center gap-3 font-bold">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <KeyRound className="h-6 w-6" />
              </span>
              <span className="text-xl">Apresenta+</span>
            </Link>
          </div>

          <div className="relative z-10 max-w-xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/75">
              Recuperação segura
            </p>

            <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
              Recupere o acesso e continue exatamente de onde parou.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/80 xl:text-lg">
              Sua apresentação, seus tópicos e seus históricos continuam protegidos. Enviaremos as instruções para o e-mail cadastrado.
            </p>

            <div className="mt-8 grid gap-3 text-sm text-primary-foreground/85">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span>O aplicativo não revela se um e-mail está cadastrado.</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0" />
                <span>As instruções são enviadas somente para o endereço informado.</span>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-primary-foreground/65">
            Organize suas ideias. Conduza sua apresentação.
          </p>
        </section>

        <section className="flex min-w-0 items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <Link
              to="/login"
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>

            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                {!sent ? (
                  <>
                    <div className="mb-7">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <KeyRound className="h-6 w-6" />
                      </div>

                      <h2 className="text-2xl font-bold sm:text-3xl">
                        Esqueceu sua senha?
                      </h2>

                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Informe o e-mail da sua conta. Enviaremos um link seguro para você criar uma nova senha.
                      </p>
                    </div>

                    {requestError && (
                      <Alert variant="destructive" className="mb-5">
                        <AlertTitle>Não foi possível enviar</AlertTitle>
                        <AlertDescription>{requestError}</AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">E-mail</Label>

                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                          <Input
                            id="forgot-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(event) => {
                              setEmail(event.target.value);
                              if (fieldError) setFieldError('');
                              if (requestError) setRequestError('');
                            }}
                            onBlur={validate}
                            placeholder="seuemail@exemplo.com"
                            className={`h-12 pl-10 ${fieldError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                            aria-invalid={Boolean(fieldError)}
                            aria-describedby={fieldError ? 'forgot-email-error' : undefined}
                            disabled={loading}
                          />
                        </div>

                        {fieldError && (
                          <p id="forgot-email-error" className="text-sm text-destructive">
                            {fieldError}
                          </p>
                        )}
                      </div>

                      <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Enviando instruções...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-5 w-5" />
                            Enviar link de recuperação
                          </>
                        )}
                      </Button>
                    </form>

                    <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
                      Por segurança, exibiremos a mesma confirmação mesmo que o endereço informado não esteja cadastrado.
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>

                    <h2 className="text-2xl font-bold sm:text-3xl">
                      Verifique seu e-mail
                    </h2>

                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Se existir uma conta associada a
                      {' '}
                      <strong className="break-all text-foreground">{sentEmail}</strong>,
                      {' '}
                      você receberá as instruções para redefinir sua senha.
                    </p>

                    <Alert className="mt-6 text-left">
                      <Mail className="h-4 w-4" />
                      <AlertTitle>O e-mail pode levar alguns minutos</AlertTitle>
                      <AlertDescription>
                        Confira também as pastas Spam, Lixo eletrônico ou Promoções.
                      </AlertDescription>
                    </Alert>

                    {requestError && (
                      <Alert variant="destructive" className="mt-4 text-left">
                        <AlertTitle>Falha ao reenviar</AlertTitle>
                        <AlertDescription>{requestError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="mt-6 space-y-3">
                      <Button asChild size="lg" className="w-full">
                        <Link to="/login">
                          <ArrowLeft className="mr-2 h-5 w-5" />
                          Voltar para o login
                        </Link>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={handleResend}
                        disabled={loading || resendSeconds > 0}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Reenviando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-5 w-5" />
                            {resendSeconds > 0
                              ? `Reenviar em ${resendSeconds}s`
                              : 'Reenviar instruções'}
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={handleChangeEmail}
                        disabled={loading}
                      >
                        Informar outro e-mail
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Lembrou sua senha?
              {' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Entrar agora
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}