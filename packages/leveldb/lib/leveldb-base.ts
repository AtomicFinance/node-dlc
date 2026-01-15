import { ClassicLevel } from 'classic-level';
import fs from 'fs';

export abstract class LeveldbBase {
  protected _path: string;
  protected _db: ClassicLevel<Buffer, Buffer>;

  constructor(path: string) {
    this._path = path;
    fs.mkdirSync(this._path, { recursive: true });
    this._db = new ClassicLevel<Buffer, Buffer>(this._path, {
      keyEncoding: 'buffer',
      valueEncoding: 'buffer',
    });
  }

  public async open(): Promise<void> {
    return this._db.open();
  }

  public async close(): Promise<void> {
    return this._db.close();
  }

  protected async _safeGet<T>(key: Buffer): Promise<T> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return (await this._db.get(key)) as unknown as T;
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (err.notFound) return;
      else throw err;
    }
  }
}
