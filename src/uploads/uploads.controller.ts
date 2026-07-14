import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from './cloudinary.service';
import { uploadFileFilter } from './upload-file.filter';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from './upload-limits';
import { UploadSizeExceptionFilter } from './upload-size.exception-filter';

@Controller('uploads') // => POST /api/uploads
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UseFilters(UploadSizeExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: uploadFileFilter,
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
    }),
  )
  async upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required.');

    const uploaded = await this.cloudinary.uploadBuffer({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    return {
      url: uploaded.secureUrl,
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType,
    };
  }
}
