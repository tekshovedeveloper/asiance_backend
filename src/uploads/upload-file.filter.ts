import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';
import { extname } from 'node:path';

const allowedDocumentExtensions = new Set([
  '.csv',
  '.doc',
  '.docx',
  '.odp',
  '.ods',
  '.odt',
  '.pdf',
  '.ppt',
  '.pptx',
  '.rtf',
  '.txt',
  '.xls',
  '.xlsx',
]);

export function uploadFileFilter(_req: Request, file: any, cb: FileFilterCallback) {
  if (!file) {
    return cb(new BadRequestException('Invalid file upload.'), false);
  }

  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = extname(file.originalname || '').toLowerCase();
  const isMedia = mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/');
  const isDocument = mimeType.startsWith('application/') ||
    mimeType.startsWith('text/') ||
    allowedDocumentExtensions.has(extension);

  if (!isMedia && !isDocument) {
    return cb(new BadRequestException('Only image, video, audio, or document files are allowed.'), false);
  }

  cb(null, true);
}
