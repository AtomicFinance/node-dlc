import { ILogger, Logger } from '@node-lightning/logger';
import sinon from 'sinon';

export function createFakeLogger(): ILogger {
  const fake = sinon.createStubInstance(Logger);
  fake.sub = createFakeLogger as any;
  return fake;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
