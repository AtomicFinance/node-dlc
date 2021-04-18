/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { parentPort } = require('worker_threads');
const cfdDlcJs = require('cfd-dlc-js');

let idle = true;

parentPort.on('message', async (message) => {
  const { method, args } = message;

  if (!idle) {
    throw new Error('NOT IDLE');
  }

  idle = false;
  const response = cfdDlcJs[method](...args);
  idle = true;
  return parentPort.postMessage(response);
});
