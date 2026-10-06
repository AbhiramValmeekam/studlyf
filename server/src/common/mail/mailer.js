/**
 * Development: prints the email (including verification/reset links) to the log so you can click
 * them locally.
 *
 * Outside development the body is NOT printed: for verification and password-reset mail the body
 * contains a live single-use token, so logging it would put a working credential into whatever
 * aggregator the log stream reaches. Production is refused at config load; this is the second
 * layer, so a misconfigured environment still cannot leak a token.
 */
export class ConsoleMailer {
  constructor(logger, { logBody = true } = {}) {
    this.logger = logger;
    this.logBody = logBody;
  }
  async send(message) {
    if (!this.logBody) {
      this.logger.warn(
        { to: message.to, subject: message.subject },
        '[mail] NOT SENT — no transport configured (set MAIL_DRIVER=smtp and SMTP_URL); body withheld',
      );
      return;
    }
    this.logger.info({ to: message.to, subject: message.subject }, `[mail]\n${message.text}`);
  }
}

/** Tests: keeps messages in memory so assertions can read the tokens. */
export class MemoryMailer {
  outbox = [];
  async send(message) {
    this.outbox.push(message);
  }
  lastTo(to) {
    return [...this.outbox].reverse().find((m) => m.to === to);
  }
}

export class SmtpMailer {
  constructor(
    smtpUrl,
    from,
  ) {
    this.from = from;
    this.transport = import('nodemailer').then((m) => m.createTransport(smtpUrl));
  }
  async send(message) {
    await (await this.transport).sendMail({ from: this.from, ...message });
  }
}

export function createMailer(config, logger) {
  switch (config.mail.driver) {
    case 'smtp':
      return new SmtpMailer(config.mail.smtpUrl, config.mail.from);
    case 'memory':
      return new MemoryMailer();
    case 'none':
      // The explicit "deliver nothing" choice. Behaviourally this is the redacted console path —
      // metadata only, body never written — so it reuses that class rather than adding a second
      // implementation of the same thing. Saying the cost out loud at boot is the point: email
      // being off is a decision an operator should see confirmed, not discover from a user.
      logger.warn(
        '[mail] MAIL_DRIVER=none — no email will be delivered. Registration and sign-in still work ' +
          '(login does not require a verified address), but email verification and PASSWORD RESET do ' +
          'not: a user who forgets their password cannot recover the account without operator help. ' +
          'Set MAIL_DRIVER=smtp and SMTP_URL to turn mail on.',
      );
      return new ConsoleMailer(logger, { logBody: false });
    default:
      return new ConsoleMailer(logger, { logBody: config.env === 'development' });
  }
}
