// tslint:disable: no-unused-expression

import { expect } from 'chai';
import { ClassicLevelBase } from '../lib';
import { rmdir } from './util';

class TestStore extends ClassicLevelBase {
  async save(key: Buffer, value: Buffer) {
    await this._db.put(key, value);
  }
  async load(key: Buffer) {
    return this._safeGet<Buffer>(key);
  }
}

describe('ClassicLevelBase', () => {
  let sut: TestStore;

  before(async () => {
    rmdir('.testdb');
    sut = new TestStore('.testdb');
    await sut.open();
  });

  after(async () => {
    await sut.close();
    rmdir('.testdb');
  });

  it('should save and load a value', async () => {
    const key = Buffer.from('key');
    const value = Buffer.from('value');
    await sut.save(key, value);
    const actual = await sut.load(key);
    expect(actual).to.deep.equal(value);
  });
});
