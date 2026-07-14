import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';
import { UPLOAD_TOO_LARGE_MESSAGE } from './upload-limits';

@Catch(MulterError)
export class UploadSizeExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const isTooLarge = exception.code === 'LIMIT_FILE_SIZE';
    const statusCode = isTooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;

    response.status(statusCode).json({
      statusCode,
      message: isTooLarge ? UPLOAD_TOO_LARGE_MESSAGE : exception.message,
      error: isTooLarge ? 'Payload Too Large' : 'Bad Request',
    });
  }
}
