import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { env } from '../config/env.js';

const uploadDirectory = path.resolve(env.UPLOAD_DIR || 'uploads');

// Asegurar que el directorio de uploads exista
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Configuración de almacenamiento en disco con nombres aleatorios seguros
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
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

const maxFileSize = (env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

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
