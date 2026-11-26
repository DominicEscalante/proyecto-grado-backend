import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import path from 'path';
import { Request, RequestHandler } from 'express';
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type';
import { extensions } from '../utils/media-types.js';
import { AppError } from '../utils/error.util.js';
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
        const ext = extensions[file.mimetype];
        cb(null, `${crypto.randomUUID()}${ext}`);
      },
    });

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (Object.hasOwn(extensions, file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Tipo de archivo no permitido: ${file.mimetype}. Formatos válidos: JPEG, PNG, WEBP, MP4, MOV, MP3, M4A, OGG, WAV o WebM de audio.`
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
    fields: 0,
    parts: 6,
    files: 5, // Máximo 5 archivos por petición
  },
});

const receive = upload.array('archivos', 5);
export const uploadEvidencias: RequestHandler = (req, res, next) => {
  receive(req, res, async error => {
    if (error) return next(error);
    const files = (req.files ?? []) as Express.Multer.File[];
    try {
      for (const file of files) {
        const detected = file.buffer ? await fileTypeFromBuffer(file.buffer) : await fileTypeFromFile(file.path);
        const expected = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
        const matchesContainer = (expected === 'audio/webm' && detected?.ext === 'webm') ||
          (expected === 'audio/mp4' && ['m4a', 'mp4'].includes(detected?.ext ?? '')) ||
          (expected === 'audio/wav' && detected?.ext === 'wav') ||
          (expected === 'audio/mpeg' && detected?.ext === 'mp3');
        if (detected?.mime !== expected && !matchesContainer) throw new Error();
      }
    } catch {
      await Promise.allSettled(files.filter(file => file.path).map(file => fs.promises.unlink(file.path)));
      return next(new AppError('El contenido del archivo no coincide con el formato indicado.', 400, 'INVALID_MEDIA'));
    }
    res.once('finish', () => {
      if (res.statusCode >= 400) void Promise.allSettled(files.filter(file => file.path).map(file => fs.promises.unlink(file.path)));
    });
    next();
  });
};
