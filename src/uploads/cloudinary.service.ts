import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { MAX_UPLOAD_FILE_SIZE_BYTES, UPLOAD_TOO_LARGE_MESSAGE } from './upload-limits';

type CloudinaryParamValue = string | number | boolean;

export type CloudinaryUpload = {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format?: string;
  bytes?: number;
};

type UploadBufferOptions = {
  buffer: Buffer;
  originalName?: string;
  mimeType?: string;
  folder?: string;
};

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {}

  async uploadBuffer(options: UploadBufferOptions): Promise<CloudinaryUpload> {
    if (!options.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    if (options.buffer.byteLength > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new BadRequestException(UPLOAD_TOO_LARGE_MESSAGE);
    }

    const cloudName = this.requiredConfig('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.requiredConfig('CLOUDINARY_API_KEY');
    const apiSecret = this.requiredConfig('CLOUDINARY_API_SECRET');
    const folder = options.folder ?? this.config.get<string>('CLOUDINARY_FOLDER') ?? 'asiance/uploads';
    const timestamp = Math.round(Date.now() / 1000);

    const signedParams: Record<string, CloudinaryParamValue> = {
      folder,
      timestamp,
      unique_filename: true,
      use_filename: true,
    };

    const form = new FormData();
    const fileBytes = new Uint8Array(options.buffer.byteLength);
    fileBytes.set(options.buffer);

    form.append(
      'file',
      new Blob([fileBytes], { type: options.mimeType || 'application/octet-stream' }),
      options.originalName || 'upload',
    );
    form.append('api_key', apiKey);

    for (const [key, value] of Object.entries(signedParams)) {
      form.append(key, String(value));
    }

    form.append('signature', this.signParams(signedParams, apiSecret));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: form,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.secure_url) {
      const message = typeof data?.error?.message === 'string'
        ? data.error.message
        : 'Cloudinary upload failed.';
      throw new InternalServerErrorException(message);
    }

    return {
      secureUrl: data.secure_url,
      publicId: data.public_id,
      resourceType: data.resource_type,
      format: data.format,
      bytes: data.bytes,
    };
  }

  private requiredConfig(key: string) {
    const value = this.config.get<string>(key);

    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured.`);
    }

    return value;
  }

  private signParams(params: Record<string, CloudinaryParamValue>, apiSecret: string) {
    const payload = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
  }
}
