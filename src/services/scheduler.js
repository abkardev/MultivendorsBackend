import cron from 'node-cron';

class Scheduler {
  constructor() {
    this.jobs = new Map();
  }

  addJob(name, cronExpression, handler) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
    }
    const task = cron.schedule(cronExpression, handler);
    this.jobs.set(name, task);
    return task;
  }

  removeJob(name) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).stop();
      this.jobs.delete(name);
    }
  }

  listJobs() {
    return Array.from(this.jobs.keys());
  }
}

export default new Scheduler();
