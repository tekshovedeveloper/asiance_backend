import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResendOtpDto, ResetPasswordDto, VerifyOtpDto } from './dto';
import { Otp, OtpDocument } from './otp.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      if (existing.isVerified) {
        throw new BadRequestException('An account with this email already exists.');
      }
      // Unverified account exists — resend OTP
      await this.dispatchOtp(dto.email);
      return { message: 'OTP resent. Please check your email to verify your account.' };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const name = `${dto.firstName} ${dto.lastName}`.trim();

    await this.users.create({
      name,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? '',
      country: dto.country,
      passwordHash,
      isVerified: false,
    });

    await this.dispatchOtp(dto.email);
    return { message: 'Registration successful. Check your email for the verification code.' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.otpModel.findOne({
      email: dto.email.toLowerCase(),
      code: dto.code,
      purpose: 'verify',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    await this.otpModel.updateOne({ _id: otp._id }, { used: true });
    await this.users.markVerified(dto.email);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new NotFoundException('No account found with this email.');
    if (user.isVerified) throw new BadRequestException('This account is already verified.');

    await this.dispatchOtp(dto.email);
    return { message: 'New verification code sent to your email.' };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password.');

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    return this.issueToken(this.users.sanitize(user.toObject()));
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.users.findByEmail(dto.email);
    if (user && user.isVerified) {
      await this.dispatchResetOtp(dto.email);
    }
    // Always return success to avoid leaking which emails exist
    return { message: 'If an account with that email exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const otp = await this.otpModel.findOne({
      email: dto.email.toLowerCase(),
      code: dto.code,
      purpose: 'reset',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired reset code.');
    }

    await this.otpModel.updateOne({ _id: otp._id }, { used: true });
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.users.updatePasswordHash(dto.email, passwordHash);

    return { message: 'Password reset successfully. You can now log in.' };
  }

  private async dispatchOtp(email: string) {
    await this.otpModel.deleteMany({ email: email.toLowerCase(), purpose: 'verify' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.otpModel.create({ email: email.toLowerCase(), code, expiresAt, purpose: 'verify' });
    await this.email.sendOtpEmail(email, code);
  }

  private async dispatchResetOtp(email: string) {
    await this.otpModel.deleteMany({ email: email.toLowerCase(), purpose: 'reset' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.otpModel.create({ email: email.toLowerCase(), code, expiresAt, purpose: 'reset' });
    await this.email.sendPasswordResetEmail(email, code);
  }

  private issueToken(user: any) {
    return {
      user,
      accessToken: this.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    };
  }
}
