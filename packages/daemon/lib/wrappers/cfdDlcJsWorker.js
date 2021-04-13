/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { parentPort } = require('worker_threads');
const cfdDlcJs = require('cfd-dlc-js');

parentPort.on('message', async (message) => {
  const { method, args } = message;

  return parentPort.postMessage(cfdDlcJs[method](...args));
});
