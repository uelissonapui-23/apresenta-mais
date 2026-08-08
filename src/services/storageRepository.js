import { getSupabaseClient } from '@/lib/supabaseClient';

const BUCKET = 'apresenta-mais-files';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
]);

function safeName(name) {
  return String(name || 'arquivo')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-120);
}

export async function createSignedUserFileUrl(path, expiresIn = SIGNED_URL_TTL_SECONDS) {
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) throw new Error('Caminho do arquivo inválido.');

  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(normalizedPath, expiresIn);

  if (error) throw error;
  return data?.signedUrl || '';
}

export async function uploadUserFile(file) {
  if (!(file instanceof File)) throw new Error('Arquivo inválido.');
  if (file.size > MAX_FILE_SIZE) throw new Error('O arquivo deve ter no máximo 5 MB.');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Formato não permitido. Use JPG, PNG, WEBP ou PDF.');

  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData?.user?.id) throw new Error('Usuário não autenticado.');

  const path = `${authData.user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const signedUrl = await createSignedUserFileUrl(path);
  return {
    file_url: signedUrl,
    signed_url: signedUrl,
    storage_path: path,
    path,
    bucket: BUCKET,
  };
}
