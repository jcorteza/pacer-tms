import { ServiceUnavailableException } from '@nestjs/common';
import type { Db } from './db/db.js';
import { AppController } from './app.controller.js';

const controllerWith = (execute: () => Promise<unknown>) => new AppController({ execute } as unknown as Db);

describe('AppController ping', () => {
  it('given the database answers, reports ok', async () => {
    const controller = controllerWith(() => Promise.resolve([]));

    await expect(controller.ping()).resolves.toEqual({ status: 'ok' });
  });

  it('given the database is down, responds 503 so the healthcheck fails', async () => {
    const controller = controllerWith(() => Promise.reject(new Error('connection refused')));

    await expect(controller.ping()).rejects.toThrow(ServiceUnavailableException);
  });
});
