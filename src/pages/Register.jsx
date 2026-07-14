import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
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
} from "lucide-react";

import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";

const REGISTER_EMAIL_KEY = "apresenta_plus_register_email";
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 45;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function getPasswordChecks(password) {
  const value = String(password || "");

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
      label: "Ainda não informada",
      className: "text-muted-foreground",
    };
  }

  if (score <= 1) {
    return {
      score,
      percentage: 25,
      label: "Fraca",
      className: "text-destructive",
    };
  }

  if (score === 2) {
    return {
      score,
      percentage: 50,
      label: "Razoável",
      className: "text-amber-600 dark:text-amber-400",
    };
  }

  if (score === 3) {
    return {
      score,
      percentage: 75,
      label: "Boa",
      className: "text-blue-600 dark:text-blue-400",
    };
  }

  return {
    score,
    percentage: 100,
    label: "Forte",
    className: "text-emerald-600 dark:text-emerald-400",
  };
}

function isStrongEnough(password) {
  return Object.values(getPasswordChecks(password)).every(Boolean);
}

function getFriendlyRegisterError(error) {
  const rawMessage = String(
    error?.message
      || error?.data?.message
      || error?.response?.data?.message
      || "",
  ).toLowerCase();

  if (
    rawMessage.includes("already")
    || rawMessage.includes("exists")
    || rawMessage.includes("registered")
    || rawMessage.includes("duplicate")
    || error?.status === 409
  ) {
    return "Já existe uma conta cadastrada com este e-mail. Entre na sua conta ou recupere a senha.";
  }

  if (
    rawMessage.includes("password")
    || rawMessage.includes("weak")
  ) {
    return "A senha não atende aos requisitos de segurança. Use pelo menos 8 caracteres, com letra maiúscula, minúscula e número.";
  }

  if (
    rawMessage.includes("invalid email")
    || rawMessage.includes("email is invalid")
  ) {
    return "O endereço de e-mail informado não é válido.";
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

  return "Não foi possível criar sua conta agora. Tente novamente em alguns instantes.";
}

function getFriendlyOtpError(error) {
  const rawMessage = String(
    error?.message
      || error?.data?.message
      || error?.response?.data?.message
      || "",
  ).toLowerCase();

  if (
    rawMessage.includes("expired")
    || rawMessage.includes("expire")
  ) {
    return "Este código expirou. Solicite um novo código e tente novamente.";
  }

  if (
    rawMessage.includes("invalid")
    || rawMessage.includes("incorrect")
    || rawMessage.includes("otp")
    || error?.status === 400
    || error?.status === 401
  ) {
    return "O código informado está incorreto. Confira o e-mail e tente novamente.";
  }

  if (
    rawMessage.includes("network")
    || rawMessage.includes("fetch")
    || rawMessage.includes("connection")
  ) {
    return "Não foi possível verificar o código. Confira sua internet e tente novamente.";
  }

  return "Não foi possível verificar seu e-mail agora. Tente novamente.";
}

function PasswordRequirement({ valid, children }) {
  return (
    <li
      className={`flex items-center gap-2 text-xs ${
        valid ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          valid
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border bg-background"
        }`}
      >
        {valid && <Check className="h-3 w-3" aria-hidden="true" />}
      </span>

      {children}
    </li>
  );
}

function RegisterBenefits() {
  const benefits = [
    {
      icon: Sparkles,
      title: "Comece mesmo sem experiência",
      description: "A criação guiada ajuda você a transformar um tema em uma apresentação bem estruturada.",
    },
    {
      icon: Presentation,
      title: "Organize tudo com facilidade",
      description: "Mova tópicos, altere a ordem e escolha quanto conteúdo deseja visualizar.",
    },
    {
      icon: ShieldCheck,
      title: "Apresente com segurança",
      description: "Acompanhe o progresso, o tempo e os assuntos já apresentados sem se perder.",
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
              Da primeira ideia ao último tópico.
            </p>
          </div>
        </div>

        <div className="mt-20 max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            Sua mensagem merece clareza
          </p>

          <h2 className="mt-4 text-4xl font-bold leading-tight xl:text-5xl">
            Crie apresentações fortes sem começar de uma página em branco.
          </h2>

          <p className="mt-5 text-base leading-relaxed text-primary-foreground/80">
            O aplicativo acompanha você na construção, no ensaio e no momento de apresentar.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {benefits.map(({ icon: Icon, title, description }) => (
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
          Já possui uma conta?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Confira também:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>A caixa de spam ou lixo eletrônico.</li>
            <li>Se o endereço de e-mail foi digitado corretamente.</li>
            <li>O código mais recente, caso tenha solicitado outro.</li>
          </ul>
        </div>

        <form onSubmit={onVerify} className="space-y-6">
          <div className="space-y-3">
            <Label className="block text-center">Código de verificação</Label>

            <div className="flex justify-center overflow-x-auto pb-1">
              <InputOTP
                maxLength={OTP_LENGTH}
                value={otpCode}
                onChange={(value) => setOtpCode(value.replace(/\D/g, ""))}
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
              >
                <InputOTPGroup>
                  {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full font-semibold"
            disabled={verifying || resending || otpCode.length !== OTP_LENGTH}
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
          Não recebeu o código?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={verifying || resending || resendSeconds > 0}
            className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending
              ? "Enviando..."
              : resendSeconds > 0
                ? `Reenviar em ${resendSeconds}s`
                : "Reenviar código"}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [step, setStep] = useState("register");
  const [otpCode, setOtpCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  const [registering, setRegistering] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedEmail = window.sessionStorage.getItem(REGISTER_EMAIL_KEY);

    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [resendSeconds]);

  const normalizedEmail = normalizeEmail(email);
  const passwordChecks = useMemo(
    () => getPasswordChecks(password),
    [password],
  );
  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password],
  );
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const canRegister = useMemo(
    () => (
      isValidEmail(normalizedEmail)
      && isStrongEnough(password)
      && passwordsMatch
      && acceptTerms
      && !registering
      && !googleLoading
    ),
    [
      acceptTerms,
      googleLoading,
      normalizedEmail,
      password,
      passwordsMatch,
      registering,
    ],
  );

  const handleRegister = async (event) => {
    event.preventDefault();

    if (registering || googleLoading) {
      return;
    }

    setError("");

    if (!isValidEmail(normalizedEmail)) {
      setError("Informe um endereço de e-mail válido.");
      return;
    }

    if (!isStrongEnough(password)) {
      setError("Crie uma senha com pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula e número.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A confirmação da senha não corresponde à senha informada.");
      return;
    }

    if (!acceptTerms) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }

    setRegistering(true);

    try {
      await base44.auth.register({
        email: normalizedEmail,
        password,
      });

      window.sessionStorage.setItem(REGISTER_EMAIL_KEY, normalizedEmail);
      setOtpCode("");
      setStep("verify");
      setResendSeconds(RESEND_COOLDOWN_SECONDS);

      toast({
        title: "Código enviado",
        description: "Confira seu e-mail para concluir o cadastro.",
      });
    } catch (registerError) {
      console.error("Erro no cadastro:", registerError);
      setError(getFriendlyRegisterError(registerError));
    } finally {
      setRegistering(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (verifying || otpCode.length !== OTP_LENGTH) {
      return;
    }

    setError("");
    setVerifying(true);

    try {
      await base44.auth.verifyOtp({
        email: normalizedEmail,
        otpCode,
      });

      await base44.auth.loginViaEmailPassword(
        normalizedEmail,
        password,
      );

      window.sessionStorage.removeItem(REGISTER_EMAIL_KEY);

      // O recarregamento completo garante que o AuthProvider reconheça
      // imediatamente o token criado pela Base44.
      window.location.assign("/onboarding");
    } catch (verifyError) {
      console.error("Erro ao verificar o código:", verifyError);
      setError(getFriendlyOtpError(verifyError));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || resendSeconds > 0) {
      return;
    }

    setError("");
    setResending(true);

    try {
      await base44.auth.resendOtp(normalizedEmail);
      setOtpCode("");
      setResendSeconds(RESEND_COOLDOWN_SECONDS);

      toast({
        title: "Novo código enviado",
        description: "Use o código mais recente recebido no seu e-mail.",
      });
    } catch (resendError) {
      console.error("Erro ao reenviar o código:", resendError);
      setError("Não foi possível reenviar o código agora. Tente novamente em alguns instantes.");
    } finally {
      setResending(false);
    }
  };

  const handleBackToRegister = () => {
    if (verifying || resending) {
      return;
    }

    setStep("register");
    setOtpCode("");
    setError("");
  };

  const handleGoogle = () => {
    if (registering || googleLoading) {
      return;
    }

    setError("");
    setGoogleLoading(true);

    try {
      base44.auth.loginWithProvider("google", "/onboarding");
    } catch (googleError) {
      console.error("Erro ao iniciar cadastro com Google:", googleError);
      setGoogleLoading(false);
      setError("Não foi possível iniciar o cadastro com Google. Tente novamente.");
    }
  };

  if (step === "verify") {
    return (
      <VerificationStep
        email={normalizedEmail}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        error={error}
        verifying={verifying}
        resending={resending}
        resendSeconds={resendSeconds}
        onVerify={handleVerify}
        onResend={handleResend}
        onBack={handleBackToRegister}
      />
    );
  }

  return (
    <div className="grid min-h-screen overflow-x-hidden bg-background lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.78fr)]">
      <RegisterBenefits />

      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <UserPlus className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Criar sua conta
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Comece a organizar suas ideias e apresentações.
            </p>
          </div>

          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-primary">Apresenta+</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Crie sua conta
            </h1>
            <p className="mt-2 text-muted-foreground">
              Leva menos de um minuto para começar.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7 lg:mt-8">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full font-medium"
              onClick={handleGoogle}
              disabled={registering || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-5 w-5" />
              )}

              Continuar com Google
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

            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleRegister} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="register-email">E-mail</Label>

                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id="register-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    className="h-12 pl-10"
                    disabled={registering || googleLoading}
                    aria-invalid={email.length > 0 && !isValidEmail(email)}
                  />
                </div>

                {email.length > 0 && !isValidEmail(email) && (
                  <p className="text-xs text-destructive">
                    Informe um endereço de e-mail válido.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Senha</Label>

                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Crie uma senha segura"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    className="h-12 px-10"
                    disabled={registering || googleLoading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    disabled={registering || googleLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">Força da senha</span>
                    <span className={`font-semibold ${passwordStrength.className}`}>
                      {passwordStrength.label}
                    </span>
                  </div>

                  <Progress value={passwordStrength.percentage} className="h-1.5" />

                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    <PasswordRequirement valid={passwordChecks.length}>
                      Pelo menos 8 caracteres
                    </PasswordRequirement>
                    <PasswordRequirement valid={passwordChecks.uppercase}>
                      Uma letra maiúscula
                    </PasswordRequirement>
                    <PasswordRequirement valid={passwordChecks.lowercase}>
                      Uma letra minúscula
                    </PasswordRequirement>
                    <PasswordRequirement valid={passwordChecks.number}>
                      Um número
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
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <Input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError("");
                    }}
                    className="h-12 px-10"
                    disabled={registering || googleLoading}
                    aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                    disabled={registering || googleLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <p
                    className={`flex items-center gap-1.5 text-xs ${
                      passwordsMatch
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                  >
                    {passwordsMatch ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}

                    {passwordsMatch
                      ? "As senhas correspondem."
                      : "As senhas ainda não correspondem."}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/25 p-3">
                <Checkbox
                  id="accept-terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  disabled={registering || googleLoading}
                  className="mt-0.5"
                />

                <Label
                  htmlFor="accept-terms"
                  className="cursor-pointer text-xs font-normal leading-relaxed text-muted-foreground"
                >
                  Li e aceito os{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => navigate("/terms")}
                  >
                    Termos de Uso
                  </button>{" "}
                  e a{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => navigate("/privacy")}
                  >
                    Política de Privacidade
                  </button>
                  .
                </Label>
              </div>

              <Button
                type="submit"
                className="h-12 w-full font-semibold"
                disabled={!canRegister}
              >
                {registering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar conta
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já possui uma conta?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}