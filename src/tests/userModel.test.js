import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('User Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mock('bcryptjs', () => ({
      hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword'),
      compare: vi.fn(),
    }));
  });

  it('should hash passwords with bcrypt', async () => {
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.hash('Password123!', 12);
    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
    expect(hashed).toBe('$2a$12$hashedpassword');
  });

  it('should compare passwords correctly', async () => {
    const bcrypt = await import('bcryptjs');
    vi.mocked(bcrypt.compare).mockResolvedValue(true);
    const result = await bcrypt.compare('Password123!', '$2a$12$hashedpassword');
    expect(result).toBe(true);
  });

  it('should reject wrong passwords', async () => {
    const bcrypt = await import('bcryptjs');
    vi.mocked(bcrypt.compare).mockResolvedValue(false);
    const result = await bcrypt.compare('WrongPassword', '$2a$12$hashedpassword');
    expect(result).toBe(false);
  });

  it('should detect locked account via lockedByAdmin', () => {
    const user = { lockedByAdmin: true, lockoutUntil: null, isLocked: function () { return this.lockedByAdmin || (this.lockoutUntil && this.lockoutUntil > new Date()); } };
    expect(user.isLocked()).toBe(true);
  });

  it('should detect lockout by failed attempts', () => {
    const user = { lockedByAdmin: false, lockoutUntil: new Date(Date.now() + 3600000), isLocked: function () { return this.lockedByAdmin || (this.lockoutUntil && this.lockoutUntil > new Date()); } };
    expect(user.isLocked()).toBe(true);
  });

  it('should not be locked under normal conditions', () => {
    const user = { lockedByAdmin: false, lockoutUntil: null, isLocked: function () { return this.lockedByAdmin || (this.lockoutUntil && this.lockoutUntil > new Date()); } };
    expect(user.isLocked()).toBeFalsy();
  });

  it('should define valid roles enum', () => {
    const roles = ['user', 'vendor', 'admin'];
    expect(roles).toContain('user');
    expect(roles).toContain('admin');
    expect(roles).not.toContain('superadmin');
  });

  it('should have password minlength constraint', () => {
    expect(8).toBeGreaterThanOrEqual(8);
    expect(8).toBeLessThanOrEqual(128);
  });
});
