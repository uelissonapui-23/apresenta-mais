import { backendConfig } from '@/lib/backendConfig';

/**
 * Ponto único para decidir qual backend cada módulo utiliza.
 *
 * Nesta primeira etapa todo o aplicativo continua no Base44. Os serviços
 * migrados passarão a consultar este arquivo, um módulo de cada vez.
 */
export function getBackendProvider() {
  return backendConfig.provider;
}

export function usesBase44() {
  return getBackendProvider() === 'base44';
}

export function usesSupabase() {
  return getBackendProvider() === 'supabase';
}
