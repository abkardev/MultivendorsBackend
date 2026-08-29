import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn() },
}));

const CLEAR = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_ENABLED'];

describe('emailService — production fail-loud', () => {
  let nodemailer;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const k of CLEAR) delete process.env[k];
  });

  afterEach(() => {
    for (const k of CLEAR) delete process.env[k];
    delete process.env.NODE_ENV;
  });

  async function load(n) {
    process.env.NODE_ENV = n;
    nodemailer = (await import('nodemailer')).default;
    const emailMod = await import('../services/emailService.js');
    return emailMod;
  }

  it('fails loudly in production when SMTP is not configured', async () => {
    const email = await load('production');
    nodemailer.createTransport.mockReturnValue({ sendMail: vi.fn() });
    await expect(email.sendPasswordResetEmail({ name: 'X', email: 'x@example.com' }, 'https://x/reset'))
      .rejects.toThrow(/SMTP is not configured/);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('does NOT fake success when createTransport throws in production', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    const email = await load('production');
    nodemailer.createTransport.mockImplementation(() => { throw new Error('boom'); });
    await expect(email.sendEmail({ to: 'x@example.com', subject: 's', html: '<p>h</p>' }))
      .rejects.toThrow('boom');
  });

  it('uses jsonTransport in development (not production)', async () => {
    const email = await load('development');
    nodemailer.createTransport.mockReturnValue({ sendMail: vi.fn().mockResolvedValue({ messageId: 'dev-msg' }) });
    const info = await email.sendPasswordResetEmail({ name: 'X', email: 'x@example.com' }, 'https://x/reset');
    expect(info.messageId).toBe('dev-msg');
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });

  it('uses real SMTP transport when configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASS = 'p';
    const email = await load('production');
    nodemailer.createTransport.mockReturnValue({ sendMail: vi.fn().mockResolvedValue({ messageId: 'm1' }) });
    await email.sendEmail({ to: 'x@example.com', subject: 's', html: '<p>h</p>' });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.example.com' }));
  });

  it('allows jsonTransport in production only via explicit SMTP_ENABLED=false', async () => {
    process.env.SMTP_ENABLED = 'false';
    const email = await load('production');
    nodemailer.createTransport.mockReturnValue({ sendMail: vi.fn().mockResolvedValue({ messageId: 'opt-out' }) });
    const info = await email.sendEmail({ to: 'x@example.com', subject: 's', html: '<p>h</p>' });
    expect(info.messageId).toBe('opt-out');
  });
});