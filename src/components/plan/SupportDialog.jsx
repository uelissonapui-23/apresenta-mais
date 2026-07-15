import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Heart, Loader2, Upload, X } from 'lucide-react';

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

const SUGGESTED_AMOUNTS = [10, 25, 50, 100];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const INITIAL_FORM = {
  name: '',
  email: '',
  amount: 25,
  payment_date: '',
  message: '',
  proof_url: '',
  proof_filename: '',
};

function normalizeMinimumAmount(paymentConfig) {
  const value = Number(paymentConfig?.minimum_support_amount);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export default function SupportDialog({
  open,
  onOpenChange,
  paymentConfig,
  user,
  onSubmitted,
}) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const submitLockRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const minimumAmount = useMemo(
    () => normalizeMinimumAmount(paymentConfig),
    [paymentConfig],
  );

  const pixReady = Boolean(
    paymentConfig?.active
      && paymentConfig?.pix_enabled
      && paymentConfig?.pix_key,
  );

  useEffect(() => {
    if (!open) return;

    const defaultAmount = Math.max(25, minimumAmount);
    setForm({
      ...INITIAL_FORM,
      name: user?.full_name || user?.name || '',
      email: user?.email || '',
      amount: defaultAmount,
    });
    setUploading(false);
    submitLockRef.current = false;
  }, [open, user, minimumAmount]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
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
    if (!file || saving || uploading) return;

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
    if (!user?.id) {
      return 'Não foi possível identificar sua conta.';
    }

    if (!pixReady) {
      return 'Os dados de pagamento ainda não foram configurados.';
    }

    if (!form.name.trim()) {
      return 'Informe seu nome.';
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < minimumAmount) {
      return `O valor mínimo para apoio é de R$ ${minimumAmount.toFixed(2).replace('.', ',')}.`;
    }

    if (!form.payment_date) {
      return 'Informe a data do pagamento.';
    }

    if (paymentConfig?.proof_required && !form.proof_url) {
      return 'Anexe o comprovante do pagamento para continuar.';
    }

    return '';
  };

  const handleSubmit = async () => {
    if (saving || uploading || submitLockRef.current) return;

    const validationMessage = validateForm();
    if (validationMessage) {
      toast({
        title: 'Revise os dados do apoio',
        description: validationMessage,
        variant: 'destructive',
      });
      return;
    }

    submitLockRef.current = true;
    setSaving(true);

    try {
      await base44.entities.SupportContribution.create({
        user_id: user.id,
        name: form.name.trim(),
        email: form.email.trim(),
        amount: Number(form.amount),
        payment_method: 'pix',
        pix_key_used: paymentConfig.pix_key,
        payment_date: form.payment_date,
        proof_url: form.proof_url,
        proof_filename: form.proof_filename,
        user_message: form.message.trim(),
        status: 'pending',
        admin_notes: '',
        analyzed_by_user_id: '',
        analyzed_at: '',
      });

      toast({
        title: 'Apoio enviado!',
        description: 'A confirmação será realizada manualmente. Obrigado por apoiar o Apresenta+!',
      });

      await onSubmitted?.();
      onOpenChange(false);
    } catch {
      toast({
        title: 'Não foi possível enviar o apoio',
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
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Apoie o Apresenta+
          </DialogTitle>
          <DialogDescription>
            Seu apoio ajuda no desenvolvimento e na manutenção do aplicativo.
            A confirmação é feita manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!pixReady && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Os dados para apoio ainda não estão disponíveis. Tente novamente mais tarde.
            </div>
          )}

          {pixReady && (
            <div className="rounded-xl border bg-rose-50/50 p-4 dark:bg-rose-950/10">
              <p className="text-sm font-semibold">Pagamento via PIX</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {paymentConfig.support_instructions
                  || 'Faça o pagamento usando a chave abaixo e depois envie os dados para confirmação.'}
              </p>

              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Chave PIX{paymentConfig.pix_key_type ? ` (${paymentConfig.pix_key_type})` : ''}
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-3 py-2 text-sm">
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
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support-name">Nome</Label>
              <Input
                id="support-name"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Seu nome"
                disabled={busy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-email">E-mail (opcional)</Label>
              <Input
                id="support-email"
                type="email"
                value={form.email}
                onChange={(event) => updateForm('email', event.target.value)}
                placeholder="seu@email.com"
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-amount">Valor (R$)</Label>
            <Input
              id="support-amount"
              type="number"
              min={minimumAmount}
              step="0.01"
              value={form.amount}
              onChange={(event) => updateForm('amount', event.target.value)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Valor mínimo: R$ {minimumAmount.toFixed(2).replace('.', ',')}
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_AMOUNTS
                .filter((amount) => amount >= minimumAmount)
                .map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={Number(form.amount) === amount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateForm('amount', amount)}
                    disabled={busy}
                  >
                    R$ {amount}
                  </Button>
                ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-payment-date">Data do pagamento</Label>
            <Input
              id="support-payment-date"
              type="date"
              value={form.payment_date}
              onChange={(event) => updateForm('payment_date', event.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Comprovante{paymentConfig?.proof_required ? ' *' : ' (opcional)'}
            </Label>

            {form.proof_url ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                <span className="min-w-0 truncate text-sm">
                  {form.proof_filename || 'Comprovante anexado'}
                </span>
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
              <label className={`flex items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors ${busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50'}`}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Enviando comprovante...' : 'Enviar comprovante'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
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
              Formatos aceitos: JPG, PNG, WEBP ou PDF, com até 10 MB.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-message">Mensagem (opcional)</Label>
            <Textarea
              id="support-message"
              value={form.message}
              onChange={(event) => updateForm('message', event.target.value)}
              placeholder="Deixe uma mensagem de apoio..."
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
            disabled={busy || !pixReady}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar apoio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}