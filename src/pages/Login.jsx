import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Presentation,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SAVED_EMAIL_KEY = "apresenta_plus_login_email";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function getFriendlyError(error) {
  const rawMessage = String(
    error?.message || error?.data?.message || error?.response?.data?.message || "",
  ).toLowerCase();

  if (
    rawMessage.includes("invalid")
    || rawMessage.includes("credential")
    || rawMessage.includes("password")
    || rawMessage.includes("unauthorized")
    || error?.status === 401
  ) {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }

  if (
    rawMessage.includes("not verified")
    || rawMessage.includes("verify")
    || rawMessage.includes("verification")
  ) {
    return "Seu e-mail ainda precisa ser verificado. Confira a mensagem enviada para sua caixa de entrada.";
  }

  if (
    rawMessage.includes("network")
    || rawMessage.includes("fetch")
    || rawMessage.includes("connection")
  ) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }

  if (
    rawMessage.includes("too many")
    || rawMessage.includes("rate limit")
    || error?.status === 429
  ) {
    return "Foram feitas muitas tentativas. Aguarde um pouco antes de tentar novamente.";
  }

  return "Não foi possível entrar agora. Tente novamente em alguns instantes.";
}

async function resolvePostLoginRoute() {
  try {
    const currentUser = await base44.auth.me();

    if (!currentUser?.id) {
      return "/";
    }

    const profiles = await base44.entities.UserProfile.filter(
      { user_id: currentUser.id },
      "-updated_date",
      1,
    );

    const profile = Array.isArray(profiles) ? profiles[0] : null;

    if (!profile || profile.onboarding_completed !== true) {
      return "/onboarding";
    }

    return "/";
  } catch (error) {
    console.warn("Não foi possível verificar o onboarding após o login:", error);
    return "/";
  }
}

function LoginBenefits() {
  const items = [
    {
      icon: Sparkles,
      title: "Criação guiada",
      description: "Receba ajuda para transformar uma ideia em uma apresentação forte.",
    },
    {
      icon: Presentation,
      title: "Apresente sem se perder",
      description: "Acompanhe tópico atual, progresso, tempo e próximos assuntos.",
    },
    {
      icon: ShieldCheck,
      title: "Conteúdo sempre salvo",
      description: "Continue seus ensaios e apresentações exatamente de onde parou.",
    },
  ];

  return (
    <div className="hidden min-h-screen w-full max-w-xl flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
      <div>
        <div className="inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Presentation className="h-6 w-6" aria-hidden="true" />
          </div>

          <div>
            <p className="text-xl font-bold">Apresenta+</p>
            <p className="text-sm text-primary-foreground/70">
              Organize suas ideias. Conduza sua apresentação.
            </p>
          </div>
        </div>

        <div className="mt-20 max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            Da ideia ao último tópico
          </p>

          <h2 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">
            Mais clareza para criar. Mais segurança para apresentar.
          </h2>

          <p className="mt-5 text-base leading-relaxed text-primary-foreground/80">
            Construa, reorganize, ensaie e apresente usando a mesma estrutura de conteúdo.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>

            <div>
              <p className="font-semibold">{title}</p>
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

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(SAVED_EMAIL_KEY);

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }

    const query = new URLSearchParams(location.search);
    const reason = query.get("reason");

    if (reason === "session-expired") {
      setError("Sua sessão expirou. Entre novamente para continuar.");
    }

    if (reason === "registered") {
      setSuccessMessage("Conta criada com sucesso. Agora você já pode entrar.");
    }

    if (reason === "password-reset") {
      setSuccessMessage("Senha atualizada com sucesso. Entre usando sua nova senha.");
    }
  }, [location.search]);

  const canSubmit = useMemo(
    () => isValidEmail(email) && password.length > 0 && !loading && !googleLoading,
    [email, googleLoading, loading, password.length],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || googleLoading) {
      return;
    }

    setError("");
    setSuccessMessage("");

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      setError("Informe um endereço de e-mail válido.");
      return;
    }

    if (!password) {
      setError("Informe sua senha.");
      return;
    }

    setLoading(true);

    try {
      await base44.auth.loginViaEmailPassword(normalizedEmail, password);

      if (rememberEmail) {
        window.localStorage.setItem(SAVED_EMAIL_KEY, normalizedEmail);
      } else {
        window.localStorage.removeItem(SAVED_EMAIL_KEY);
      }

      const targetRoute = await resolvePostLoginRoute();

      // A autenticação da Base44 atualiza o token fora do ciclo do React.
      // O redirecionamento completo garante que o AuthProvider recarregue com o novo token.
      window.location.assign(targetRoute);
    } catch (loginError) {
      console.error("Erro no login:", loginError);
      setError(getFriendlyError(loginError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (loading || googleLoading) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setGoogleLoading(true);

    try {
      const callbackUrl = `${window.location.origin}/`;
      base44.auth.loginWithProvider("google", callbackUrl);
    } catch (providerError) {
      console.error("Erro no login com Google:", providerError);
      setGoogleLoading(false);
      setError("Não foi possível iniciar o login com Google.");
    }
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);

    if (error) {
      setError("");
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);

    if (error) {
      setError("");
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
      <LoginBenefits />

      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary lg:mx-0">
              <LogIn className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
            </div>

            <p className="mb-2 text-sm font-semibold text-primary">Bem-vindo de volta</p>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Entre no Apresenta+
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Acesse suas apresentações, ensaios e conteúdos salvos.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            {successMessage && (
              <Alert className="mb-5 border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
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

              {googleLoading ? "Abrindo Google..." : "Continuar com Google"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>

              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">ou entre com e-mail</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>

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
                    aria-invalid={Boolean(email) && !isValidEmail(email)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="login-password">Senha</Label>

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
                    type={showPassword ? "text" : "password"}
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
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    disabled={loading || googleLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-email"
                  checked={rememberEmail}
                  onCheckedChange={(checked) => setRememberEmail(checked === true)}
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
            Ainda não possui uma conta?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Criar conta gratuitamente
            </Link>
          </p>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            Ao entrar, você concorda em usar o aplicativo de forma responsável e manter seus dados de acesso protegidos.
          </p>
        </div>
      </div>
    </main>
  );
}