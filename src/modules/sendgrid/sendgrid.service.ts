import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class SendgridService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'ServiExpress'
      },
      subject,
      html,
    };
    await sgMail.send(msg);
  }
}