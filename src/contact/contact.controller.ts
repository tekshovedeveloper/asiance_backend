import { Body, Controller, Post } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { ContactInquiryDto } from './dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly email: EmailService) {}

  @Post()
  async submitInquiry(@Body() dto: ContactInquiryDto) {
    await this.email.sendContactInquiry(dto);
    return { ok: true, message: 'Your message has been sent to the Asiance team.' };
  }
}
