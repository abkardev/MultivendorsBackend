import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('emailService — templates and delivery gating (no credentials required)', () => {
  let email;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_ENABLED;
  });

  it('password reset email template renders subject, reset URL and expiry', async () => {
    process.env.NODE_ENV = 'development';
    email = await import('../services/emailService.js');
    const info = await email.sendPasswordResetEmail(
      { name: 'Alice', email: 'user@example.com' },
      'https://app.example.com/reset?token=abc123',
    );
    expect(info).toBeTruthy();
    expect(JSON.stringify(info.message)).toContain('Password Reset');
    expect(JSON.stringify(info.message)).toContain('abc123');
    expect(JSON.stringify(info.message)).toContain('user@example.com');
  });

  it('2FA enable email template renders a string subject (regression: previously threw TypeError)', async () => {
    process.env.NODE_ENV = 'development';
    email = await import('../services/emailService.js');
    const info = await email.sendTwoFactorEnabledEmail({ name: 'Alice', email: 'user@example.com' });
    const msg = JSON.parse(info.message);
    expect(typeof msg.subject).toBe('string');
    expect(msg.subject).toBe('Two-Factor Authentication Enabled');
  });

  it('2FA disable email template renders a string subject', async () => {
    process.env.NODE_ENV = 'development';
    email = await import('../services/emailService.js');
    const info = await email.sendTwoFactorDisabledEmail({ name: 'Alice', email: 'user@example.com' });
    const msg = JSON.parse(info.message);
    expect(typeof msg.subject).toBe('string');
    expect(msg.subject).toBe('Two-Factor Authentication Disabled');
  });

  it('generic notification email sends in dev via jsonTransport without errors', async () => {
    process.env.NODE_ENV = 'development';
    email = await import('../services/emailService.js');
    const info = await email.sendEmail({ to: 'vendor@example.com', subject: 'Order update', html: '<p>hi</p>' });
    const msg = JSON.parse(info.message);
    expect(msg.to[0].address).toBe('vendor@example.com');
    expect(msg.subject).toBe('Order update');
  });

  it('throws loudly in production when SMTP is not configured (never silently drops mail)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_ENABLED;
    email = await import('../services/emailService.js');
    await expect(email.sendEmail({ to: 'x@example.com', subject: 't', html: 'h' })).rejects.toThrow(/SMTP is not configured/);
  });
});