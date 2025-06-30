import { ILogger, Logger } from '@node-dlc/logger';
import sinon from 'sinon';

export function createFakeLogger(): ILogger {
  const fake = sinon.createStubInstance(Logger);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fake.sub = createFakeLogger as any;
  return fake;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
