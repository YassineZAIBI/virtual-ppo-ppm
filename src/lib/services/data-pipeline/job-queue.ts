import { db } from '@/lib/db';

export interface CreateJobInput {
  userId: string;
  jobType: string;
  input: Record<string, any>;
}

export async function createJob(data: CreateJobInput) {
  return db.dataJob.create({
    data: {
      userId: data.userId,
      jobType: data.jobType,
      input: JSON.stringify(data.input),
      status: 'pending',
    },
  });
}

export async function startJob(jobId: string) {
  return db.dataJob.update({
    where: { id: jobId },
    data: { status: 'running', startedAt: new Date() },
  });
}

export async function updateJobProgress(jobId: string, progress: number) {
  return db.dataJob.update({
    where: { id: jobId },
    data: { progress: Math.min(100, Math.max(0, progress)) },
  });
}

export async function completeJob(jobId: string, output: Record<string, any>) {
  return db.dataJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      output: JSON.stringify(output),
      progress: 100,
      completedAt: new Date(),
    },
  });
}

export async function failJob(jobId: string, error: string) {
  return db.dataJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      error,
      completedAt: new Date(),
    },
  });
}

export async function getJob(jobId: string) {
  return db.dataJob.findUnique({ where: { id: jobId } });
}
