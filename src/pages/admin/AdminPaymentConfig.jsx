import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Save,
  Shield,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
];

const DEFAULT_CONFIG = {
  pix_enabled: false,
  pix_key: '',
  pix_key_type: 'random',
  recipient_name: '',
  recipient_document: '',
  bank_name: '',
  instructions: '',
  support_instructions: '',
  plan_payment_instructions: '',
  minimum_support_amount: 0,
  suggested_amounts: '10, 25, 50, 100',
  proof_required: true,
  active: true,
};

function normalizeSuggestedAmounts(value) {
  const uniqueValues = [...new Set(
    String(value || '')
      .split(',')
      .map((item) => Number(String(item).trim().replace(',', '.')))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => Math.round(item * 100) / 100),
  )];

  return uniqueValues.sort((a, b) => a - b).join(', ');
}

function validatePixKey(type, rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return false;

  if (type === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  if (type === 'phone') {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  }

  if (type === 'cpf') {
    return value.replace(/\D/g, '').length === 11;
  }

  if (type === 'cnpj') {
    return value.replace(/\D/g, '').length === 14;
  }

  return value.length >= 8;
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-10">
      <Card className="w-full border-destructive/20">
        <CardContent className="p-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Acesso restrito</h1>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPaymentConfig() {
  const { toast } = useToast();
  const { user, isAdmin, loading: userLoading } = useCurrentUser();

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const rows = await base44.entities.PaymentConfiguration.filter(
        { active: true },
        '-updated_date',
        20,
      );

      const validRows = Array.isArray(rows)
        ? rows.filter((row) => row?.id)
        : [];

      setConfig(validRows.length > 0 ? validRows[0] : { ...DEFAULT_CONFIG });
    } catch {
      toast({ title: 'Falha ao carregar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  const update = (key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!config || saving || saveLockRef.current) return;

    const pixKeyType = config.pix_key_type || 'random';
    const pixKey = String(config.pix_key || '').trim();
    const recipientName = String(config.recipient_name || '').trim();
    const minimumSupportAmount = Number(config.minimum_support_amount) || 0;
    const suggestedAmounts = normalizeSuggestedAmounts(config.suggested_amounts);

    if (minimumSupportAmount < 0) {
      toast({
        title: 'Valor mínimo inválido',
        description: 'O valor mínimo de apoio não pode ser negativo.',
        variant: 'destructive',
      });
      return;
    }

    if (config.pix_enabled) {
      if (!recipientName) {
        toast({
          title: 'Informe o recebedor',
          description: 'O nome do recebedor é obrigatório para ativar o PIX.',
          variant: 'destructive',
        });
        return;
      }

      if (!validatePixKey(pixKeyType, pixKey)) {
        toast({
          title: 'Chave PIX inválida',
          description: 'Revise o tipo e o valor da chave antes de ativar o PIX.',
          variant: 'destructive',
        });
        return;
      }
    }

    saveLockRef.current = true;
    setSaving(true);

    try {
      const payload = {
        pix_enabled: !!config.pix_enabled,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
        recipient_name: recipientName,
        recipient_document: String(config.recipient_document || '').trim(),
        bank_name: String(config.bank_name || '').trim(),
        instructions: String(config.instructions || '').trim(),
        support_instructions: String(config.support_instructions || '').trim(),
        plan_payment_instructions: String(config.plan_payment_instructions || '').trim(),
        minimum_support_amount: minimumSupportAmount,
        suggested_amounts: suggestedAmounts,
        proof_required: config.proof_required !== false,
        active: true,
        updated_by_user_id: user?.id || '',
      };

      let saved;

      if (config.id) {
        saved = await base44.entities.PaymentConfiguration.update(config.id, payload);
      } else {
        saved = await base44.entities.PaymentConfiguration.create(payload);
      }

      setConfig({
        ...DEFAULT_CONFIG,
        ...payload,
        ...(saved || {}),
      });

      toast({ title: 'Configuração salva' });
    } catch (error) {
      console.error('Erro ao salvar configuração PIX:', error);
      toast({
        title: 'Não foi possível salvar',
        description: 'Revise os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  };

  if (userLoading || loading) return <LoadingState />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Administração
            </Link>
          </Button>
          <h1 className="text-2xl font-bold sm:text-3xl">Pagamentos (PIX)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure a chave PIX usada para planos e apoios.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => loadData({ silent: true })}
          disabled={saving}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </header>

      {!config?.pix_enabled && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          O PIX está desativado. Os usuários não verão os dados de pagamento até que você ative.
        </div>
      )}

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Configuração do PIX</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <p className="font-medium">PIX ativado</p>
              <p className="text-xs text-muted-foreground">
                Quando ativado, os usuários verão os dados de pagamento.
              </p>
            </div>
            <Switch checked={!!config?.pix_enabled} onCheckedChange={(v) => update('pix_enabled', v)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo da chave</Label>
              <select
                value={config?.pix_key_type || 'random'}
                onChange={(e) => update('pix_key_type', e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {KEY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input value={config?.pix_key || ''} onChange={(e) => update('pix_key', e.target.value)} placeholder="A chave PIX..." />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do recebedor</Label>
              <Input value={config?.recipient_name || ''} onChange={(e) => update('recipient_name', e.target.value)} placeholder="Nome ou razão social" />
            </div>
            <div className="space-y-2">
              <Label>Documento (opcional)</Label>
              <Input value={config?.recipient_document || ''} onChange={(e) => update('recipient_document', e.target.value)} placeholder="CPF ou CNPJ" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Banco (opcional)</Label>
            <Input value={config?.bank_name || ''} onChange={(e) => update('bank_name', e.target.value)} placeholder="Nome do banco" />
          </div>

          <div className="space-y-2">
            <Label>Instruções gerais</Label>
            <Textarea value={config?.instructions || ''} onChange={(e) => update('instructions', e.target.value)} rows={2} placeholder="Instruções gerais de pagamento..." />
          </div>

          <div className="space-y-2">
            <Label>Instruções para planos</Label>
            <Textarea value={config?.plan_payment_instructions || ''} onChange={(e) => update('plan_payment_instructions', e.target.value)} rows={2} placeholder="Instruções específicas para pagamento de planos..." />
          </div>

          <div className="space-y-2">
            <Label>Instruções para apoios</Label>
            <Textarea value={config?.support_instructions || ''} onChange={(e) => update('support_instructions', e.target.value)} rows={2} placeholder="Instruções específicas para apoios..." />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Valor mínimo de apoio</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={config?.minimum_support_amount ?? 0}
                onChange={(e) => update('minimum_support_amount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valores sugeridos (separados por vírgula)</Label>
              <Input
                value={config?.suggested_amounts || ''}
                onChange={(e) => update('suggested_amounts', e.target.value)}
                onBlur={() => update(
                  'suggested_amounts',
                  normalizeSuggestedAmounts(config?.suggested_amounts),
                )}
                placeholder="10, 25, 50, 100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Comprovante obrigatório</p>
              <p className="text-xs text-muted-foreground">
                Exige comprovante para solicitações e apoios.
              </p>
            </div>
            <Switch checked={config?.proof_required !== false} onCheckedChange={(v) => update('proof_required', v)} />
          </div>

          <Button onClick={handleSave} disabled={saving || !config}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar configuração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}