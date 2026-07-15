import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, FileText, Loader2, Upload, X } from 'lucide-react';

import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const REQUEST_TYPES = [
  { value: 'subscription', label: 'Assinatura sem anúncios' },
  { value: 'renewal', label: 'Renovação' },
  { value: 'plan_change', label: 'Alteração de plano' },
  { value: 'permanent_unlock', label: 'Liberação permanente' },
  { value: 'other', label: 'Outro' },
];

const INITIAL_FORM = {
  plan_id: '',
  request_type: 'subscription',
  amount_informed: 0,
  payer_name: '',
  payment_date: '',
  user_note: '',
  proof_url: '',
  proof_filename: '',
};

const ACTIVE_REQUEST_STATUSES = new Set(['pending', 'under_review']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

function getFirstPaidPlan(plans) {
  return plans.find(
    (plan) => plan?.active && plan.billing_period !== 'free',
  );
}

export default function PlanRequestDialog({
  open,
  onOpenChange,
  plans = [],
  paymentConfig,
  userId,
  currentPlanId,
  onSubmitted,
}) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const submitLockRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const paidPlans = useMemo(
    () => plans.filter(
      (plan) => plan?.active && plan.billing_period !== 'free',
    ),
    [plans],
  );

  const selectedPlan = useMemo(
    () => paidPlans.find((plan) => plan.id === form.plan_id) || null,
    [paidPlans, form.plan_id],
  );

  const pixReady = Boolean(
    paymentConfig?.active
      && paymentConfig?.pix_enabled
      && paymentConfig?.pix_key,
  );

  useEffect(() => {
    if (!open) return;

    const firstPaidPlan = getFirstPaidPlan(plans);
    setForm({
      ...INITIAL_FORM,
      plan_id: firstPaidPlan?.id || '',
      amount_informed: Number(firstPaidPlan?.price) || 0,
      request_type:
        currentPlanId && firstPaidPlan?.id === currentPlanId
          ? 'renewal'
          : 'subscription',
    });
    setUploading(false);
    submitLockRef.current = false;
  }, [open, plans, currentPlanId]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handlePlanChange = (planId) => {
    const plan = paidPlans.find((item) => item.id === planId);

    setForm((current) => ({
      ...current,
      plan_id: planId,
      amount_informed: Number(plan?.price) || 0,
      request_type:
        planId && planId === currentPlanId
          ? 'renewal'
          : current.request_type === 'renewal'
            ? 'subscription'
            : current.request_type,
    }));
  };

  const handleCopyPix = async () => {
    if (!paymentConfig?.pix_key) return;

    try {
      await navigator.clipboard.writeText(paymentConfig.pix_key);
      toast({ title: 'Chave PIX copiada' });
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Selecione a chave e copie manualmente.',
        variant: 'destructive',
      });
    }
  };

  const clearProof = () => {
    setForm((current) => ({
      ...current,
      proof_url: '',
      proof_filename: '',
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || uploading || saving) return;

    if (!ACCEPTED_FILE_TYPES.has(file.type)) {
      toast({
        title: 'Formato não permitido',
        description: 'Envie uma imagem JPG, PNG, WEBP ou um arquivo PDF.',
        variant: 'destructive',
      });
      clearProof();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O comprovante deve ter no máximo 10 MB.',
        variant: 'destructive',
      });
      clearProof();
      return;
    }

    setUploading(true);

    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = result?.file_url;

      if (!fileUrl) {
        throw new Error('Upload sem URL de retorno.');
      }

      setForm((current) => ({
        ...current,
        proof_url: fileUrl,
        proof_filename: file.name,
      }));

      toast({ title: 'Comprovante anexado' });
    } catch {
      clearProof();
      toast({
        title: 'Não foi possível enviar o comprovante',
        description: 'Confira sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    if (!userId) {
      return 'Não foi possível identificar sua conta.';
    }

    if (!pixReady) {
      return 'Os dados de pagamento ainda não foram configurados.';
    }

    if (!selectedPlan) {
      return 'Selecione um plano válido.';
    }

    if (!form.payer_name.trim()) {
      return 'Informe o nome usado no pagamento.';
    }

    if (!form.payment_date) {
      return 'Informe a data do pagamento.';
    }

    if ((Number(form.amount_informed) || 0) <= 0) {
      return 'Informe um valor de pagamento válido.';
    }

    if (paymentConfig?.proof_required && !form.proof_url) {
      return 'Anexe o comprovante de pagamento para continuar.';
    }

    return '';
  };

  const handleSubmit = async () => {
    if (saving || uploading || submitLockRef.current) return;

    const validationMessage = validateForm();
    if (validationMessage) {
      toast({
        title: 'Revise a solicitação',
        description: validationMessage,
        variant: 'destructive',
      });
      return;
    }

    submitLockRef.current = true;
    setSaving(true);

    try {
      const existingRows = await base44.entities.PlanRequest.filter(
        { user_id: userId, plan_id: form.plan_id },
        '-created_date',
        20,
      );

      const hasOpenRequest = Array.isArray(existingRows)
        && existingRows.some((request) => ACTIVE_REQUEST_STATUSES.has(request?.status));

      if (hasOpenRequest) {
        toast({
          title: 'Solicitação já enviada',
          description: 'Já existe uma solicitação pendente ou em análise para este plano.',
          variant: 'destructive',
        });
        return;
      }

      await base44.entities.PlanRequest.create({
        user_id: userId,
        plan_id: form.plan_id,
        request_type: form.request_type,
        status: 'pending',
        amount_informed: Number(form.amount_informed) || 0,
        payment_method: 'pix',
        payer_name: form.payer_name.trim(),
        payment_date: form.payment_date,
        proof_url: form.proof_url,
        proof_filename: form.proof_filename,
        user_note: form.user_note.trim(),
        admin_note: '',
        analyzed_at: '',
        analyzed_by_user_id: '',
        activation_date: '',
        expiration_date: '',
        rejection_reason: '',
      });

      toast({
        title: 'Solicitação enviada',
        description: 'A aprovação será realizada manualmente pelo administrador.',
      });

      await onSubmitted?.();
      onOpenChange(false);
    } catch {
      toast({
        title: 'Não foi possível enviar',
        description: 'Confira sua conexão e tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  };

  const busy = saving || uploading;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar plano</DialogTitle>
          <DialogDescription>
            Escolha o plano, faça o pagamento via PIX e envie os dados para
            aprovação manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!pixReady && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Os dados de pagamento ainda não estão disponíveis. O envio ficará
              bloqueado até a configuração do PIX ser concluída.
            </div>
          )}

          {paidPlans.length === 0 && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Nenhum plano pago está disponível no momento.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="requested-plan">Plano desejado</Label>
            <select
              id="requested-plan"
              value={form.plan_id}
              onChange={(event) => handlePlanChange(event.target.value)}
              disabled={busy || paidPlans.length === 0}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Selecione um plano</option>
              {paidPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {formatCurrency(plan.price)}
                </option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="font-semibold">{selectedPlan.name}</p>
                  {selectedPlan.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedPlan.description}
                    </p>
                  )}
                  <p className="mt-2 text-sm font-medium">
                    Valor informado: {formatCurrency(form.amount_informed)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="request-type">Tipo de solicitação</Label>
            <select
              id="request-type"
              value={form.request_type}
              onChange={(event) => updateForm('request_type', event.target.value)}
              disabled={busy}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {pixReady && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Pagamento via PIX</p>
              <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                {paymentConfig.plan_payment_instructions
                  || paymentConfig.instructions
                  || 'Realize o pagamento usando a chave abaixo.'}
              </p>

              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Chave PIX{paymentConfig.pix_key_type ? ` (${paymentConfig.pix_key_type})` : ''}
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-md border bg-background px-3 py-2 text-sm">
                    {paymentConfig.pix_key}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPix}
                    disabled={busy}
                    aria-label="Copiar chave PIX"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {paymentConfig.recipient_name && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recebedor: {paymentConfig.recipient_name}
                  </p>
                )}

                {paymentConfig.bank_name && (
                  <p className="text-xs text-muted-foreground">
                    Instituição: {paymentConfig.bank_name}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payer-name">Nome do pagador</Label>
              <Input
                id="payer-name"
                value={form.payer_name}
                onChange={(event) => updateForm('payer_name', event.target.value)}
                placeholder="Nome usado no PIX"
                maxLength={120}
                disabled={busy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Valor pago (R$)</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount_informed}
                onChange={(event) => updateForm('amount_informed', event.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-date">Data do pagamento</Label>
            <Input
              id="payment-date"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={form.payment_date}
              onChange={(event) => updateForm('payment_date', event.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Comprovante
              {paymentConfig?.proof_required ? ' *' : ' (opcional)'}
            </Label>

            {form.proof_url ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">
                    {form.proof_filename || 'Comprovante anexado'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={clearProof}
                  disabled={busy}
                  aria-label="Remover comprovante"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label
                className={`flex items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors ${
                  busy
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:bg-muted/50'
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Enviando comprovante...' : 'Enviar comprovante'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
            )}

            <p className="text-xs text-muted-foreground">
              JPG, PNG, WEBP ou PDF, com no máximo 10 MB.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-note">Observação (opcional)</Label>
            <Textarea
              id="request-note"
              value={form.user_note}
              onChange={(event) => updateForm('user_note', event.target.value)}
              placeholder="Inclua alguma informação útil para a conferência."
              rows={3}
              maxLength={1000}
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              busy
              || !pixReady
              || !selectedPlan
              || paidPlans.length === 0
            }
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}