import { expect } from 'chai';
import * as irc from 'irc';
import { sleep } from '@liquality/utils';

describe('transport', () => {
  it('should', async () => {
    expect(1).to.equal(1);

    const client = new irc.Client('irc.darkscience.net', 'aslkdjflajfas', {
      debug: true,
      channels: ['#darkscience'],
    });

    client.addListener('message', function (from, to, message) {
      console.log(from + ' => ' + to + ': ' + message);
    });

    await sleep(10000);
  });
});
