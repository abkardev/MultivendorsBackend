import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    validate: vi.fn(() => true),
  },
}));

describe('Scheduler', () => {
  let scheduler;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/scheduler.js');
    scheduler = mod.default;
  });

  it('should add a scheduled job', () => {
    const handler = vi.fn();
    const task = scheduler.addJob('test-job', '*/5 * * * *', handler);
    expect(task).toBeDefined();
    expect(scheduler.listJobs()).toContain('test-job');
  });

  it('should remove a scheduled job', () => {
    const handler = vi.fn();
    scheduler.addJob('remove-me', '*/5 * * * *', handler);
    scheduler.removeJob('remove-me');
    expect(scheduler.listJobs()).not.toContain('remove-me');
  });

  it('should list all registered jobs', () => {
    scheduler.listJobs().forEach(j => scheduler.removeJob(j));
    scheduler.addJob('job-a', '*/5 * * * *', vi.fn());
    scheduler.addJob('job-b', '0 */2 * * *', vi.fn());
    const jobs = scheduler.listJobs();
    expect(jobs).toContain('job-a');
    expect(jobs).toContain('job-b');
    expect(jobs.length).toBe(2);
  });

  it('should replace existing job with same name', () => {
    const oldHandler = vi.fn();
    const newHandler = vi.fn();
    scheduler.addJob('dup-job', '*/5 * * * *', oldHandler);
    scheduler.addJob('dup-job', '0 0 * * *', newHandler);
    expect(scheduler.listJobs().filter(j => j === 'dup-job').length).toBe(1);
  });

  it('should handle removing non-existent job gracefully', () => {
    expect(() => scheduler.removeJob('non-existent')).not.toThrow();
  });
});
