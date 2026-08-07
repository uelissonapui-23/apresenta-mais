import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

import { authProvider, isSupabaseAuthActive } from '@/services/authProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

const MIN_PASSWORD_LENGTH = 8;

function getResetToken(search) {
  const params = new URLSearchParams(search);

  return (
    params.get('resetToken')
    || params.get('reset_token')
    || params.get('token')
    || params.get('code')
    || ''
  ).trim();
}

function getPasswordRules(password) {
  const value = String(password || '');

  return [
    {
      id: 'length',
      label: `Pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
      valid: value.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: 'upper',
      label: 'Uma letra maiúscula',
      valid: /[A-Z]/.test(value),
    },
    {
      id: 'lower',
      label: 'Uma letra minúscula',
      valid: /[a-z]/.test(value),
    },
    {
      id: 'number',
      label: 'Um número',
      valid: /\d/.test(value),
    },
  ];
}

function getFriendlyError(error) {
  const rawMessage = String(
    error?.message || error?.response?.data?.message || error || '',
  ).toLowerCase();

  if (
    rawMessage.includes('expired')
    || rawMessage.includes('invalid token')
    || rawMessage.includes('invalid reset')
    || rawMessage.includes('token is invalid')
  ) {
    return 'Este link de redefinição expirou ou já foi utilizado. Solicite um novo link.';
  }

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

  if (
    rawMessage.includes('password')
    && (
      rawMessage.includes('weak')
      || rawMessage.includes('short')
      || rawMessage.includes('invalid')
    )
  ) {
    return 'A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.';
  }

  return 'Não foi possível redefinir sua senha agora. Tente novamente ou solicite um novo link.';
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

function PasswordRule({ valid, children }) {
  return (
    <li
      className={`flex items-center gap-2 text-xs ${
        valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          valid
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-muted-foreground/35'
        }`}
      >
        {valid && <Check className="h-3 w-3" />}
      </span>
      {children}
    </li>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken = useMemo(
    () => (
      isSupabaseAuthActive()
        ? 'supabase-recovery-session'
        : getResetToken(location.search)
    ),
    [location.search],
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [success, setSuccess] = useState(false);

  const passwordRules = useMemo(
    () => getPasswordRules(newPassword),
    [newPassword],
  );

  const validRuleCount = passwordRules.filter((rule) => rule.valid).length;
  const passwordStrength = Math.round(
    (validRuleCount / passwordRules.length) * 100,
  );
  const passwordIsStrong = validRuleCount === passwordRules.length;

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const currentUser = await authProvider.me();

        if (active && currentUser?.id && !resetToken) {
          navigate('/', { replace: true });
          return;
        }
      } catch {
        // Usuário não autenticado: continua na página.
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
  }, [navigate, resetToken]);

  const validate = () => {
    const errors = {};

    if (!newPassword) {
      errors.newPassword = 'Digite sua nova senha.';
    } else if (!passwordIsStrong) {
      errors.newPassword = 'A senha ainda não atende a todos os requisitos.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirme sua nova senha.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'As senhas digitadas não são iguais.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || !resetToken || !validate()) {
      return;
    }

    setLoading(true);
    setRequestError('');

    try {
      await authProvider.resetPassword({
        resetToken,
        newPassword,
      });

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors({});
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      setRequestError(getFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (value) => {
    setNewPassword(value);
    setRequestError('');

    if (fieldErrors.newPassword) {
      setFieldErrors((current) => ({
        ...current,
        newPassword: '',
      }));
    }
  };

  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    setRequestError('');

    if (fieldErrors.confirmPassword) {
      setFieldErrors((current) => ({
        ...current,
        confirmPassword: '',
      }));
    }
  };

  if (checkingSession) {
    return <AuthLoading />;
  }

  if (!resetToken) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-muted/30 px-4 py-8">
        <Card className="w-full max-w-md border-border/70 shadow-lg">
          <CardContent className="p-6 text-center sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="h-8 w-8" />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Link inválido ou incompleto
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              O link usado não contém as informações necessárias para redefinir a senha. Solicite um novo e-mail de recuperação.
            </p>

            <Button asChild size="lg" className="mt-7 w-full">
              <Link to="/forgot-password">
                <KeyRound className="mr-2 h-5 w-5" />
                Solicitar novo link
              </Link>
            </Button>

            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-muted/30 px-4 py-8">
        <Card className="w-full max-w-md overflow-hidden border-emerald-500/25 shadow-lg">
          <div className="h-1.5 bg-emerald-500" />

          <CardContent className="p-6 text-center sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Senha redefinida
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Sua nova senha foi salva com sucesso. Agora você já pode entrar novamente no Apresenta+.
            </p>

            <Alert className="mt-6 text-left">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Conta protegida</AlertTitle>
              <AlertDescription>
                Use a nova senha nas próximas vezes que acessar sua conta.
              </AlertDescription>
            </Alert>

            <Button
              size="lg"
              className="mt-7 w-full"
              onClick={() => navigate('/login?reset=success', { replace: true })}
            >
              Ir para o login
              <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            </Button>
          </CardContent>
        </Card>
      </main>
    );
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
            <Link to="/login" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <KeyRound className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">Apresenta+</span>
            </Link>
          </div>

          <div className="relative z-10 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              Segurança da sua conta
            </p>

            <h2 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">
              Crie uma nova senha segura.
            </h2>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/80">
              Escolha uma combinação que seja fácil para você lembrar e difícil para outras pessoas descobrirem.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Use uma senha exclusiva para esta conta.',
                'Evite nomes, datas de nascimento e sequências óbvias.',
                'Não compartilhe sua senha com outras pessoas.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-relaxed text-primary-foreground/85">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-primary-foreground/60">
            Organize suas ideias. Conduza sua apresentação.
          </p>
        </section>

        <section className="flex min-w-0 items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o login
              </Link>
            </Button>

            <div className="mb-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary lg:hidden">
                <LockKeyhole className="h-7 w-7" />
              </div>

              <h1 className="mt-5 text-2xl font-bold sm:text-3xl lg:mt-0">
                Defina sua nova senha
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Digite e confirme a senha que será usada nos próximos acessos.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {requestError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Não foi possível redefinir a senha</AlertTitle>
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>

                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => handlePasswordChange(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.newPassword)}
                    className="h-12 pr-11"
                    placeholder="Digite uma senha segura"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {fieldErrors.newPassword && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.newPassword}
                  </p>
                )}
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium">Força da senha</span>
                  <span className="text-xs text-muted-foreground">
                    {passwordStrength}%
                  </span>
                </div>

                <Progress value={passwordStrength} className="h-2" />

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {passwordRules.map((rule) => (
                    <PasswordRule key={rule.id} valid={rule.valid}>
                      {rule.label}
                    </PasswordRule>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>

                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => handleConfirmPasswordChange(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    className="h-12 pr-11"
                    placeholder="Digite a senha novamente"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>O link é de uso único</AlertTitle>
                <AlertDescription>
                  Depois de salvar a nova senha, este link não poderá ser utilizado novamente.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Salvando nova senha...
                  </>
                ) : (
                  <>
                    <LockKeyhole className="mr-2 h-5 w-5" />
                    Salvar nova senha
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              O link expirou?{' '}
              <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                Solicitar outro
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}