import {
    BadRequestException,
    Controller,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
  } from '@nestjs/common';
  import { Request } from 'express';
  import { AuthGuard } from '@nestjs/passport';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import * as path from 'node:path';
  import * as fs from 'node:fs';
  
  function getUploadsDir() {
    // __dirname = apps/api/dist/uploads → go up two levels to apps/api/uploads
    const dir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  
  function safeExt(originalName: string) {
    const ext = path.extname(originalName || '').toLowerCase();
    const allowed = new Set([
      '.png', '.jpg', '.jpeg', '.webp', '.gif',
      '.mp4', '.mov', '.webm', '.avi', '.mkv',
      '.mp3', '.wav', '.ogg', '.aac', '.flac',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    ]);
    return allowed.has(ext) ? ext : path.extname(originalName || '').toLowerCase() || '.bin';
  }
  
  @Controller('uploads') // => POST /api/uploads
  export class UploadsController {
    @Post()
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: (_req, _file, cb) => cb(null, getUploadsDir()),
          filename: (_req, file, cb) => {
            const ext = safeExt(file.originalname) || '.jpg';
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${ext}`);
          },
        }),
        limits: { fileSize: 100 * 1024 * 1024 },
      }),
    )
    upload(@UploadedFile() file: any, @Req() req: Request) {
      if (!file) throw new BadRequestException('File is required.');
      const base = `${req.protocol}://${req.get('host')}`;
      return { url: `${base}/api/uploads/${file.filename}` };
    }
  }