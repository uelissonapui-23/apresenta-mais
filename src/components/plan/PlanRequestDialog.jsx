import React, { useMemo, useState } from 'react';
import { Copy, Loader2, Upload, X } from 'lucide-react';

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

export default function PlanRequestDialog({
  open,
  onOpenChange,
  plans,
  paymentConfig,
  userId,
  currentPlanId,
  onSubmitted,
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plan_id: '',
    request_type: 'subscription',
    amount_informed: 0,
    payer_name: '',
    payment_date: '',
    user_note: '',
    proof_url: '',
    proof_filename: '',
  });

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === form.plan_id),
    [plans, form.plan_id],
  );

  const pixReady = paymentConfig?.pix_enabled && paymentConfig?.pix_key;

  React.useEffect(() => {
    if (open && !form.plan_id) {
      const firstPaid = plans.find((p) => p.billing_period !== 'free' && p.active);
      setForm((prev) => ({
        ...prev,
        plan_id: firstPaid?.id || '',
        amount_informed: firstPaid?.price || 0,
      }));
    }
  }, [open, plans]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePlanChange = (planId) => {
    const plan = plans.find((p) => p.id === planId);
    updateForm('plan_id', planId);
    if (plan) updateForm('amount_informed', plan.price);
  };

  const handleCopyPix = async () => {
    if (!paymentConfig?.pix_key) return;
    try {
      await navigator.clipboard.writeText(paymentConfig.pix_key);
      toast({ title: 'Chave PIX copiada' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O comprovante deve ter no máximo 10MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateForm('proof_url', file_url);
      updateForm('proof_filename', file.name);
      toast({ title: 'Comprovante anexado' });
    } catch {
      toast({
        title: 'Não foi possível enviar o comprovante',
        description: 'Você pode informar a URL do comprovante manualmente.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    if (!form.plan_id) {
      toast({ title: 'Selecione um plano', variant: 'destructive' });
      return;
    }

    if (form.plan_id === currentPlanId) {
      toast({ title: 'Você já possui este plano', variant: 'destructive' });
      return;
    }

    if (paymentConfig?.proof_required && !form.proof_url) {
      toast({
        title: 'Comprovante necessário',
        description: 'Anexe o comprovante de pagamento para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      await base44.entities.PlanRequest.create({
        user_id: userId,
        plan_id: form.plan_id,
        request_type: form.request_type,
        status: 'pending',
        amount_informed: Number(form.amount_informed) || 0,
        payment_method: 'pix',
        payer_name: form.payer_name.trim(),
        payment_date: form.payment_date || '',
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
        description: 'A aprovação é realizada manualmente pelo administrador.',
      });

      onSubmitted?.();
      onOpenChange(false);

      setForm({
        plan_id: '',
        request_type: 'subscription',
        amount_informed: 0,
        payer_name: '',
        payment_date: '',
        user_note: '',
        proof_url: '',
        proof_filename: '',
      });
    } catch {
      toast({
        title: 'Não foi possível enviar',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar plano</DialogTitle>
          <DialogDescription>
            Escolha o plano, realize o pagamento via PIX e anexe o comprovante.
            A aprovação é manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!pixReady && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Os dados de pagamento ainda não estão configurados. Tente novamente
              mais tarde.
            </div>
          )}

          <div className="space-y-2">
            <Label>Plano desejado</Label>
            <select
              value={form.plan_id}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione um plano</option>
              {plans.filter((p) => p.active && p.billing_period !== 'free').map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — R$ {Number(plan.price || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de solicitação</Label>
            <select
              value={form.request_type}
              onChange={(e) => updateForm('request_type', e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {pixReady && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Pagamento via PIX</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {paymentConfig.plan_payment_instructions ||
                  'Realize o pagamento usando a chave abaixo.'}
              </p>

              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">Chave PIX ({paymentConfig.pix_key_type})</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border bg-background px-3 py-2 text-sm">
                    {paymentConfig.pix_key}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPix}
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
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do pagador</Label>
              <Input
                value={form.payer_name}
                onChange={(e) => updateForm('payer_name', e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor pago (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount_informed}
                onChange={(e) => updateForm('amount_informed', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data do pagamento</Label>
            <Input
              type="date"
              value={form.payment_date}
              onChange={(e) => updateForm('payment_date', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Comprovante</Label>
            {form.proof_url ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <span className="truncate text-sm">{form.proof_filename || 'Comprovante anexado'}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    updateForm('proof_url', '');
                    updateForm('proof_filename', '');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                Enviar comprovante
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={form.user_note}
              onChange={(e) => updateForm('user_note', e.target.value)}
              placeholder="Alguma informação adicional para o administrador?"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.plan_id}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}