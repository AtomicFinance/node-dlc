import { ClassicLevel } from 'classic-level';

export class ClassicLevelBase {
  protected _db: ClassicLevel<Buffer, Buffer>;
  constructor(private _location: string) {}

  public async open(): Promise<void> {
    this._db = new ClassicLevel(this._location, {
      keyEncoding: 'buffer',
      valueEncoding: 'buffer',
    });
    await this._db.open();
  }

  public async close(): Promise<void> {
    if (this._db) await this._db.close();
  }

  protected async _safeGet<T>(key: Buffer): Promise<T | undefined> {
    try {
      return (await this._db.get(key)) as T;
    } catch (err: any) {
      if (err.notFound) return undefined;
      throw err;
    }
  }
}
