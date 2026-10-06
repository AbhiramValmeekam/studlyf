import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config/index.js';
import { createMailer, ConsoleMailer } from '../src/common/mail/mailer.js';

/**
 * The production mail guard, straight at the config boundary.
 *
 * Sending real mail is optional for a first deploy, but the server refuses to boot without an
 * explicit answer, because the default (`console`) prints live verification and reset tokens into
 * the log stream and delivers nothing. `none` is that decision made deliberately.
 */

// The minimum a production config needs to get past every other guard, so each case below fails
// (or passes) for the reason under test and not an unrelated missing variable.
const prodEnv = (overrides = {}) => ({
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/studlyf',
  APP_URL: 'https://studlyf.in',
  API_PUBLIC_URL: 'https://api.studlyf.in',
  CORS_ORIGINS: 'https://studlyf.in',
  TRUST_PROXY: '1',
  ...overrides,
});

describe('mail driver', () => {
  it('refuses to boot in production with the console driver', () => {
    expect(() => loadConfig(prodEnv({ MAIL_DRIVER: 'console' }))).toThrow(/MAIL_DRIVER/);
  });

  it('refuses the memory driver in production, since no user ever receives those messages', () => {
    expect(() => loadConfig(prodEnv({ MAIL_DRIVER: 'memory' }))).toThrow(/MAIL_DRIVER/);
  });

  it('refuses smtp without a URL', () => {
    expect(() => loadConfig(prodEnv({ MAIL_DRIVER: 'smtp' }))).toThrow(/SMTP_URL/);
  });

  it('accepts smtp once the URL is set', () => {
    const config = loadConfig(prodEnv({ MAIL_DRIVER: 'smtp', SMTP_URL: 'smtps://u:p@mail.example.com:465' }));
    expect(config.mail.driver).toBe('smtp');
  });

  it('accepts an explicit `none` so mail can be turned off on purpose', () => {
    const config = loadConfig(prodEnv({ MAIL_DRIVER: 'none' }));
    expect(config.mail.driver).toBe('none');
  });

  it('still warns about the localhost URL defaults it cannot paper over', () => {
    expect(() => loadConfig(prodEnv({ MAIL_DRIVER: 'none', APP_URL: 'http://localhost:5173' }))).toThrow(
      /APP_URL/,
    );
    expect(() => loadConfig(prodEnv({ MAIL_DRIVER: 'none', API_PUBLIC_URL: 'http://localhost:4000' }))).toThrow(
      /API_PUBLIC_URL/,
    );
  });

  it('builds a mailer for `none` that withholds the body and says so at boot', async () => {
    const warnings = [];
    // pino takes (obj, msg) — record both, or a test can pass while the structured fields that
    // identify the recipient are silently dropped.
    const record = (a, m) =>
      warnings.push(typeof a === 'string' ? a : [JSON.stringify(a), m].join(' '));
    const logger = { warn: record, info: record };
    const config = loadConfig(prodEnv({ MAIL_DRIVER: 'none' }));
    const mailer = createMailer(config, logger);

    expect(mailer).toBeInstanceOf(ConsoleMailer);
    // The boot warning has to name what is actually off — otherwise "no email" reads as a
    // transport hiccup rather than "password reset does not work".
    expect(warnings.join('\n')).toMatch(/PASSWORD RESET/);

    await mailer.send({ to: 'someone@example.com', subject: 'Reset', text: 'token=SECRET-TOKEN' });
    expect(warnings.join('\n')).not.toContain('SECRET-TOKEN');
    expect(warnings.join('\n')).toContain('someone@example.com');
  });

  it('prints the body only in development, where a clickable link is the point', async () => {
    const lines = [];
    const logger = { info: (a, m) => lines.push(typeof a === 'string' ? a : m), warn: () => {} };
    const dev = loadConfig({ NODE_ENV: 'development', MAIL_DRIVER: 'console' });
    expect(dev.env).toBe('development');

    await createMailer(dev, logger).send({ to: 'dev@example.com', subject: 'Reset', text: 'token=DEV-TOKEN' });
    expect(lines.join('\n')).toContain('DEV-TOKEN');
  });
});
