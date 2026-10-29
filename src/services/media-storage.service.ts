import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { env } from '../config/env.js';

const supabase = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const mediaStorageService = {
  isCloudEnabled: () => supabase !== null,

  async upload(file: Express.Multer.File): Promise<{ url: string; storagePath?: string }> {
    if (!supabase) {
      return { url: `/uploads/${file.filename}` };
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const objectPath = `${crypto.randomUUID()}${ext}`;
    const { error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new Error(`No se pudo guardar la evidencia en Supabase: ${error.message}`);

    const { data } = supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(objectPath);

    return { url: data.publicUrl, storagePath: objectPath };
  },

  async remove(paths: string[]): Promise<void> {
    if (!supabase || paths.length === 0) return;
    const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove(paths);
    if (error) console.error('No se pudieron limpiar archivos multimedia de Supabase:', error.message);
  },
};
