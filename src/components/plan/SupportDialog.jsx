import React, { useState } from 'react';
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

export default function SupportDialog({
  open,
  onOpenChange,
  paymentConfig,
  user,
  onSubmitted,
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    amount: 25,
    payment_date: '',
    message: '',
    proof_url: '',
    proof_filename: '',
  });

  const pixReady = paymentConfig?.pix_enabled && paymentConfig?.pix_key;

  React.useEffect(() => {
    if (open && user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.full_name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [open, user]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Informe seu nome', variant: 'destructive' });
      return;
    }

    if (Number(form.amount) <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' });
      return;
    }

    if (paymentConfig?.proof_required && !form.proof_url) {
      toast({
        title: 'Comprovante necessário',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      await base44.entities.SupportContribution.create({
        user_id: user?.id || '',
        name: form.name.trim(),
        email: form.email.trim(),
        amount: Number(form.amount) || 0,
        payment_method: 'pix',
        pix_key_used: paymentConfig?.pix_key || '',
        payment_date: form.payment_date || '',
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
        description: 'A confirmação será realizada manualmente. Obrigado!',
      });

      onSubmitted?.();
      onOpenChange(false);

      setForm({
        name: '',
        email: '',
        amount: 25,
        payment_date: '',
        message: '',
        proof_url: '',
        proof_filename: '',
      });
    } catch {
      toast({
        title: 'Não foi possível enviar',
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
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Apoie o Apresenta+
          </DialogTitle>
          <DialogDescription>
            Seu apoio ajuda no desenvolvimento e manutenção do aplicativo.
            A confirmação é manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!pixReady && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Os dados para apoio ainda não estão configurados. Tente novamente
              mais tarde.
            </div>
          )}

          {pixReady && (
            <div className="rounded-xl border bg-rose-50/50 p-4 dark:bg-rose-950/10">
              <p className="text-sm font-semibold">Pagamento via PIX</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {paymentConfig.support_instructions ||
                  'Use a chave abaixo para fazer sua contribuição.'}
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
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail (opcional)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              min={paymentConfig?.minimum_support_amount || 1}
              step="0.01"
              value={form.amount}
              onChange={(e) => updateForm('amount', e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={Number(form.amount) === amount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateForm('amount', amount)}
                >
                  R$ {amount}
                </Button>
              ))}
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
            <Label>Mensagem (opcional)</Label>
            <Textarea
              value={form.message}
              onChange={(e) => updateForm('message', e.target.value)}
              placeholder="Deixe uma mensagem de apoio..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar apoio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}