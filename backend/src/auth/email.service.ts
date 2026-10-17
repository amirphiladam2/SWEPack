import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend = process.env.RESEND_API
    ? new Resend(process.env.RESEND_API)
    : null;

  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL;
    const from = process.env.EMAIL_FROM ?? 'no-reply@support.swe.com';
    if (!this.resend || !frontendUrl) {
      throw new InternalServerErrorException(
        'Password recovery is not configured.',
      );
    }

    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const { error } = await this.resend.emails.send({
      from,
      to: email,
      subject: 'Reset your SWEPack password',
      text: `Reset your SWEPack password using this link: ${resetUrl}\n\nThis link expires in 30 minutes and can only be used once.`,
    });
    if (error) {
      this.logger.error(`Password reset email failed: ${error.message}`);
      throw new InternalServerErrorException(
        'Password recovery is temporarily unavailable.',
      );
    }
  }
}
