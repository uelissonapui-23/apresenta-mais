import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  Tablet,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const AD_TYPES = [
  { value: 'banner', label: 'Banner' },
  { value: 'native', label: 'Nativo' },
  { value: 'interstitial', label: 'Intersticial' },
  { value: 'rewarded', label: 'Recompensado' },
  { value: 'internal_promotion', label: 'Promoção interna' },
];

const POSITIONS = [
  { value: 'top', label: 'Topo' },
  { value: 'bottom', label: 'Rodapé' },
  { value: 'sidebar', label: 'Lateral' },
  { value: 'inline', label: 'Embutido' },
];

const DEFAULT_CONFIG = {
  ads_enabled: false,
  provider: 'none',
  environment: 'test',
  banner_enabled: true,
  interstitial_enabled: false,
  rewarded_enabled: false,
  test_mode: true,
  default_banner_code: '',
  default_interstitial_code: '',
  default_rewarded_code: '',
  frequency_limit: 3,
  minimum_interval_minutes: 5,
  admin_preview_enabled: true,
  active: true,
};

function uniqueById(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.id) map.set(row.id, row);
  }
  return [...map.values()];
}

function normalizeRoutes(value) {
  return [...new Set(
    String(value || '')
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.startsWith('/') ? item : `/${item}`)),
  )].join('\n');
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

export default function AdminAds() {
  const { toast } = useToast();
  const { user, isAdmin, loading: userLoading } = useCurrentUser();

  const [config, setConfig] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const configSaveLockRef = useRef(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    page_key: 'all',
    position: 'bottom',
    ad_type: 'banner',
    enabled: true,
    show_on_mobile: true,
    show_on_tablet: true,
    show_on_desktop: true,
    show_in_portrait: true,
    show_in_landscape: true,
    excluded_routes_json: '',
    order_index: 0,
    active: true,
  });
  const [savingPlacement, setSavingPlacement] = useState(false);
  const placementSaveLockRef = useRef(false);
  const deleteLockRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [configRows, placementRows] = await Promise.all([
        base44.entities.AdConfiguration.filter({ active: true }, '-updated_date', 5),
        base44.entities.AdPlacement.filter({}, 'order_index', 100),
      ]);

      const configs = uniqueById(configRows);
      setConfig(configs.length > 0 ? { ...DEFAULT_CONFIG, ...configs[0] } : { ...DEFAULT_CONFIG });
      setPlacements(uniqueById(placementRows));
    } catch {
      toast({ title: 'Falha ao carregar', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  const updateConfig = (key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const handleSaveConfig = async () => {
    if (!config || savingConfig || configSaveLockRef.current) return;

    const frequencyLimit = Number(config.frequency_limit);
    const minimumInterval = Number(config.minimum_interval_minutes);
    const provider = String(config.provider || 'none').trim() || 'none';

    if (!Number.isFinite(frequencyLimit) || frequencyLimit < 0) {
      toast({
        title: 'Limite de frequência inválido',
        description: 'Use um número igual ou maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (!Number.isFinite(minimumInterval) || minimumInterval < 0) {
      toast({
        title: 'Intervalo inválido',
        description: 'Use um número de minutos igual ou maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (
      config.ads_enabled
      && config.test_mode === false
      && provider.toLowerCase() === 'none'
    ) {
      toast({
        title: 'Informe o provedor',
        description: 'Para ativar anúncios reais, selecione um provedor válido.',
        variant: 'destructive',
      });
      return;
    }

    configSaveLockRef.current = true;
    setSavingConfig(true);

    try {
      const payload = {
        ads_enabled: !!config.ads_enabled,
        provider,
        environment: config.environment || 'test',
        banner_enabled: !!config.banner_enabled,
        interstitial_enabled: !!config.interstitial_enabled,
        rewarded_enabled: !!config.rewarded_enabled,
        test_mode: config.test_mode !== false,
        default_banner_code: String(config.default_banner_code || '').trim(),
        default_interstitial_code: String(config.default_interstitial_code || '').trim(),
        default_rewarded_code: String(config.default_rewarded_code || '').trim(),
        frequency_limit: frequencyLimit,
        minimum_interval_minutes: minimumInterval,
        admin_preview_enabled: config.admin_preview_enabled !== false,
        active: true,
        updated_by_user_id: user?.id || '',
      };

      let saved;
      if (config.id) {
        saved = await base44.entities.AdConfiguration.update(config.id, payload);
      } else {
        saved = await base44.entities.AdConfiguration.create(payload);
      }

      setConfig({
        ...DEFAULT_CONFIG,
        ...payload,
        ...(saved || {}),
      });

      toast({ title: 'Configuração salva' });
    } catch (error) {
      console.error('Erro ao salvar configuração de anúncios:', error);
      toast({
        title: 'Não foi possível salvar',
        description: 'Revise os dados e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      configSaveLockRef.current = false;
      setSavingConfig(false);
    }
  };

  const openNewPlacement = () => {
    setEditingPlacement(null);
    setForm({
      name: '',
      code: '',
      description: '',
      page_key: 'all',
      position: 'bottom',
      ad_type: 'banner',
      enabled: true,
      show_on_mobile: true,
      show_on_tablet: true,
      show_on_desktop: true,
      show_in_portrait: true,
      show_in_landscape: true,
      excluded_routes_json: '',
      order_index: 0,
      active: true,
    });
    setFormOpen(true);
  };

  const openEditPlacement = (placement) => {
    setEditingPlacement(placement);
    setForm({
      name: placement.name || '',
      code: placement.code || '',
      description: placement.description || '',
      page_key: placement.page_key || 'all',
      position: placement.position || 'bottom',
      ad_type: placement.ad_type || 'banner',
      enabled: placement.enabled !== false,
      show_on_mobile: placement.show_on_mobile !== false,
      show_on_tablet: placement.show_on_tablet !== false,
      show_on_desktop: placement.show_on_desktop !== false,
      show_in_portrait: placement.show_in_portrait !== false,
      show_in_landscape: placement.show_in_landscape !== false,
      excluded_routes_json: placement.excluded_routes_json || '',
      order_index: Number(placement.order_index) || 0,
      active: placement.active !== false,
    });
    setFormOpen(true);
  };

  const handleSavePlacement = async () => {
    if (savingPlacement || placementSaveLockRef.current) return;

    const name = form.name.trim();
    const code = form.code.trim();

    if (!name || !code) {
      toast({ title: 'Nome e código são obrigatórios', variant: 'destructive' });
      return;
    }

    const duplicateCode = placements.some(
      (placement) =>
        placement.id !== editingPlacement?.id
        && String(placement.code || '').trim().toLowerCase() === code.toLowerCase(),
    );

    if (duplicateCode) {
      toast({
        title: 'Código já utilizado',
        description: 'Cada posição precisa ter um código exclusivo.',
        variant: 'destructive',
      });
      return;
    }

    if (
      !form.show_on_mobile
      && !form.show_on_tablet
      && !form.show_on_desktop
    ) {
      toast({
        title: 'Selecione ao menos um dispositivo',
        variant: 'destructive',
      });
      return;
    }

    if (!form.show_in_portrait && !form.show_in_landscape) {
      toast({
        title: 'Selecione ao menos uma orientação',
        variant: 'destructive',
      });
      return;
    }

    placementSaveLockRef.current = true;
    setSavingPlacement(true);

    try {
      const payload = {
        name,
        code,
        description: form.description.trim(),
        page_key: form.page_key || 'all',
        position: form.position,
        ad_type: form.ad_type,
        enabled: !!form.enabled,
        show_on_mobile: !!form.show_on_mobile,
        show_on_tablet: !!form.show_on_tablet,
        show_on_desktop: !!form.show_on_desktop,
        show_in_portrait: !!form.show_in_portrait,
        show_in_landscape: !!form.show_in_landscape,
        excluded_routes_json: normalizeRoutes(form.excluded_routes_json),
        order_index: Number(form.order_index) || 0,
        active: !!form.active,
      };

      if (editingPlacement?.id) {
        await base44.entities.AdPlacement.update(editingPlacement.id, payload);
        toast({ title: 'Posição atualizada' });
      } else {
        await base44.entities.AdPlacement.create(payload);
        toast({ title: 'Posição criada' });
      }

      setFormOpen(false);
      loadData({ silent: true });
    } catch {
      toast({ title: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      placementSaveLockRef.current = false;
      setSavingPlacement(false);
    }
  };

  const handleDeletePlacement = async () => {
    if (!deleteTarget?.id || deleteLockRef.current) return;

    deleteLockRef.current = true;

    try {
      await base44.entities.AdPlacement.delete(deleteTarget.id);
      toast({ title: 'Posição excluída' });
      setDeleteTarget(null);
      loadData({ silent: true });
    } catch {
      toast({ title: 'Não foi possível excluir', variant: 'destructive' });
    } finally {
      deleteLockRef.current = false;
    }
  };

  if (userLoading || loading) return <LoadingState />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Administração
            </Link>
          </Button>
          <h1 className="text-2xl font-bold sm:text-3xl">Anúncios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure a exibição de anúncios e as posições permitidas.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setRefreshing(true);
            loadData({ silent: true });
          }}
          disabled={refreshing || savingConfig || savingPlacement}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </header>

      {/* Global Config */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" />
            Configuração global
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <p className="font-medium">Anúncios ativos</p>
              <p className="text-xs text-muted-foreground">
                Ativa ou desativa globalmente a exibição de anúncios.
              </p>
            </div>
            <Switch checked={!!config?.ads_enabled} onCheckedChange={(v) => updateConfig('ads_enabled', v)} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <p className="font-medium">Modo de teste</p>
              <p className="text-xs text-muted-foreground">
                Exibe blocos de demonstração sem carregar anúncios reais.
              </p>
            </div>
            <Switch checked={config?.test_mode !== false} onCheckedChange={(v) => updateConfig('test_mode', v)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Input
                value={config?.provider || ''}
                onChange={(e) => updateConfig('provider', e.target.value)}
                placeholder="none, admob, adsense..."
              />
            </div>
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <select
                value={config?.environment || 'test'}
                onChange={(e) => updateConfig('environment', e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="test">Teste</option>
                <option value="staging">Homologação</option>
                <option value="production">Produção</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Identificador do banner</Label>
              <Input
                value={config?.default_banner_code || ''}
                onChange={(e) => updateConfig('default_banner_code', e.target.value)}
                placeholder="ID do bloco de anúncio"
              />
            </div>
            <div className="space-y-2">
              <Label>Identificador do intersticial</Label>
              <Input
                value={config?.default_interstitial_code || ''}
                onChange={(e) => updateConfig('default_interstitial_code', e.target.value)}
                placeholder="ID do bloco de anúncio"
              />
            </div>
            <div className="space-y-2">
              <Label>Identificador do recompensado</Label>
              <Input
                value={config?.default_rewarded_code || ''}
                onChange={(e) => updateConfig('default_rewarded_code', e.target.value)}
                placeholder="ID do anúncio recompensado"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Limite de frequência</Label>
              <Input
                type="number"
                min="0"
                value={config?.frequency_limit ?? 3}
                onChange={(e) => updateConfig('frequency_limit', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Intervalo mínimo (minutos)</Label>
              <Input
                type="number"
                min="0"
                value={config?.minimum_interval_minutes ?? 5}
                onChange={(e) => updateConfig('minimum_interval_minutes', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <p className="font-medium">Prévia para administradores</p>
              <p className="text-xs text-muted-foreground">
                Mostra a área de prévia quando o modo de teste estiver ativo.
              </p>
            </div>
            <Switch
              checked={config?.admin_preview_enabled !== false}
              onCheckedChange={(value) => updateConfig('admin_preview_enabled', value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={!!config?.banner_enabled} onCheckedChange={(v) => updateConfig('banner_enabled', v)} />
              <span className="text-sm">Banners</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!config?.interstitial_enabled} onCheckedChange={(v) => updateConfig('interstitial_enabled', v)} />
              <span className="text-sm">Intersticiais</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!config?.rewarded_enabled} onCheckedChange={(v) => updateConfig('rewarded_enabled', v)} />
              <span className="text-sm">Recompensados</span>
            </div>
          </div>

          <Button onClick={handleSaveConfig} disabled={savingConfig || !config}>
            {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar configuração
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {config?.test_mode !== false && config?.admin_preview_enabled !== false && (
        <Card className="border-dashed border-primary/30">
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prévia (modo teste)
            </p>
            <div className="flex min-h-[72px] items-center justify-center rounded-xl border border-dashed bg-muted/30 p-3 text-center">
              <div className="flex flex-col items-center gap-1">
                <Megaphone className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Espaço publicitário — nenhum anúncio real é carregado em modo de teste.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placements */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Posições de anúncio</h2>
        <Button size="sm" onClick={openNewPlacement}>
          <Plus className="mr-2 h-4 w-4" />
          Nova posição
        </Button>
      </div>

      {placements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma posição cadastrada. Crie posições para controlar onde os anúncios aparecem.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {placements.map((placement) => (
            <Card key={placement.id} className="border-border/70">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{placement.name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{placement.code}</Badge>
                    {placement.active === false && <Badge variant="secondary">Inativo</Badge>}
                    {placement.enabled === false && <Badge variant="secondary">Desabilitado</Badge>}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      {placement.show_on_mobile !== false ? 'Mobile' : 'Sem mobile'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tablet className="h-3 w-3" />
                      {placement.show_on_tablet !== false ? 'Tablet' : 'Sem tablet'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {placement.show_on_desktop !== false ? 'Desktop' : 'Sem desktop'}
                    </span>
                    <span>Página: {placement.page_key || 'all'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => openEditPlacement(placement)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="shrink-0 text-destructive" onClick={() => setDeleteTarget(placement)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Placement Dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => !savingPlacement && setFormOpen(v)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlacement ? 'Editar posição' : 'Nova posição'}</DialogTitle>
            <DialogDescription>
              Defina onde e como o anúncio será exibido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Banner do dashboard" />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Ex.: home_bottom_banner" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Página</Label>
                <Input value={form.page_key} onChange={(e) => setForm((f) => ({ ...f, page_key: e.target.value }))} placeholder="all, home, presentations..." />
              </div>
              <div className="space-y-2">
                <Label>Posição</Label>
                <select
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  value={form.ad_type}
                  onChange={(e) => setForm((f) => ({ ...f, ad_type: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {AD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rotas excluídas (uma por linha)</Label>
              <Textarea
                value={form.excluded_routes_json}
                onChange={(e) => setForm((f) => ({ ...f, excluded_routes_json: e.target.value }))}
                rows={3}
                placeholder={'/present/\n/rehearsal/\n/login'}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { key: 'show_on_mobile', label: 'Mobile', icon: Smartphone },
                { key: 'show_on_tablet', label: 'Tablet', icon: Tablet },
                { key: 'show_on_desktop', label: 'Desktop', icon: Monitor },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2 rounded-lg border p-2">
                  <Switch checked={form[item.key]} onCheckedChange={(v) => setForm((f) => ({ ...f, [item.key]: v }))} />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg border p-2">
                <Switch
                  checked={form.show_in_portrait}
                  onCheckedChange={(value) => setForm((current) => ({
                    ...current,
                    show_in_portrait: value,
                  }))}
                />
                <span className="text-xs">Retrato</span>
              </div>

              <div className="flex items-center gap-2 rounded-lg border p-2">
                <Switch
                  checked={form.show_in_landscape}
                  onCheckedChange={(value) => setForm((current) => ({
                    ...current,
                    show_in_landscape: value,
                  }))}
                />
                <span className="text-xs">Paisagem</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
              <span className="text-sm">Habilitada</span>
              <Switch
                checked={form.enabled}
                onCheckedChange={(value) => setForm((current) => ({
                  ...current,
                  enabled: value,
                }))}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
              <span className="text-sm">Registro ativo</span>
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={savingPlacement}>Cancelar</Button>
            <Button onClick={handleSavePlacement} disabled={savingPlacement}>
              {savingPlacement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir posição"
        description={`Excluir "${deleteTarget?.name || ''}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDeletePlacement}
        variant="destructive"
      />
    </div>
  );
}