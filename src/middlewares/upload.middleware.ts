import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import { env } from '../config/env.js';

const supabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
const uploadDirectory = path.resolve(env.UPLOAD_DIR);
if (!supabaseConfigured) fs.mkdirSync(uploadDirectory, { recursive: true });

// En Supabase se usa memoria para enviar el buffer directamente al bucket.
// En desarrollo local se conserva el almacenamiento en disco.
const storage = supabaseConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDirectory),
      filename: (_req, file, cb) => {
        const ext = file.originalname.match(/\.[^.]+$/)?.[0].toLowerCase() || '';
        cb(null, `${crypto.randomUUID()}${ext}`);
      },
    });

// Filtro de tipos MIME permitidos
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'video/mp4',
    'video/quicktime',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Tipo de archivo no permitido: ${file.mimetype}. Formatos válidos: JPEG, PNG, WEBP, MP4.`
      )
    );
  }
};

// Supabase Free permite archivos de hasta 50 MB.
const maxFileSize = Math.min(env.MAX_FILE_SIZE_MB, 50) * 1024 * 1024;

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 5, // Máximo 5 archivos por petición
  },
});

// Middleware para subir hasta 5 evidencias (fotos/video) bajo el campo 'archivos'
export const uploadEvidencias = upload.array('archivos', 5);
