import { OutPoint, Script, Tx, Value } from '@node-lightning/bitcoin';
import { BitcoindClient } from '@node-lightning/bitcoind';
import { EventEmitter } from 'events';

export class TxWatcher extends EventEmitter {
  /**
   * Outpoints that are being watched
   */
  public watchedOutPoints: Map<string, OutPoint>;

  /**
   * ScriptPubKeys that are being watched
   */
  public watchedScriptPubKeys: Map<string, [Script, Value]>;

  private _client: BitcoindClient;

  /**
   * TxWatcher listens for transactions that match certain patterns
   * and events when a transaction is found matching the pattern
   *
   * @param client
   */
  constructor(client: BitcoindClient) {
    super();
    this._client = client;
    this.watchedOutPoints = new Map<string, OutPoint>();
    this.watchedScriptPubKeys = new Map<string, [Script, Value]>();
  }

  /**
   * Starts watching for transactions
   */
  public start(): void {
    this._client.subscribeRawTx();
    this._client.on('rawtx', this._onRawTx.bind(this));
  }

  /**
   * Stops watching for transactions
   */
  public stop(): void {
    // this._client.close();
  }

  /**
   * Watches an outpoint for broadcase in a new transaction
   * @param outpoint
   */
  public watchOutpoint(outpoint: OutPoint): void {
    const key = outpoint.toString();
    this.watchedOutPoints.set(key, outpoint);
  }

  /**
   * Watches a scriptpubkey for broadcast in a new transaction
   * @param scriptPubKey
   * @param value
   */
  public watchScriptPubKey(scriptPubKey: Script, value?: Value): void {
    const key = scriptPubKey.toString();
    this.watchedScriptPubKeys.set(key, [scriptPubKey, value]);
  }

  ////////////////////////////////////////////////////////////////

  private _checkOutpoints(tx: Tx) {
    for (const vin of tx.inputs) {
      const key = vin.outpoint.toString();
      const watchedOutpoint = this.watchedOutPoints.get(key);
      if (watchedOutpoint) {
        this.watchedOutPoints.delete(key);
        this.emit('outpointspent', tx, watchedOutpoint);
      }
    }
  }

  private _checkScriptPubkeys(tx: Tx) {
    for (const vout of tx.outputs) {
      const key = vout.scriptPubKey.toString();
      const watchedScriptPubKey = this.watchedScriptPubKeys.get(key);
      if (watchedScriptPubKey) {
        const [, value] = watchedScriptPubKey;
        if (!value || (value && vout.value === value)) {
          this.watchedScriptPubKeys.delete(key);
          this.emit('scriptpubkeyreceived', tx, watchedScriptPubKey);
        }
      }
    }
  }

  private _onRawTx(buf: Buffer) {
    try {
      const tx = Tx.fromBuffer(buf);
      this.emit('tx', tx);
      this._checkOutpoints(tx);
      this._checkScriptPubkeys(tx);
    } catch (e) {
      console.error('Failed to deserialize tx', buf.toString('hex'));
    }
  }
}
