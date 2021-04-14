import { StaticPool } from 'node-worker-threads-pool';
import cfdDlcJs from 'cfd-dlc-js';

const FILE_PATH = '../lib/wrappers/cfdDlcJsWorker.js';

const pool = new StaticPool({
  size: 4,
  task: FILE_PATH,
});

const METHODS_TO_PARALLELIZE = [
  'VerifyCetAdaptorSignatures',
  'CreateCetAdaptorSignatures',
];

type CfdDlcJs = typeof cfdDlcJs;

export function getWrappedCfdDlcJs(): CfdDlcJs {
  const wrappedCfdDlcJs = new Proxy(
    {},
    {
      get: function (_, method) {
        if (METHODS_TO_PARALLELIZE.indexOf(method as string) !== -1) {
          return async (...args) => {
            await new Promise((res) => {
              res(1);
            });
            const res = await pool.exec({ method, args });
            return res;
          };
        }
        return cfdDlcJs[method];
      },
    },
  );

  return wrappedCfdDlcJs as CfdDlcJs;
}
