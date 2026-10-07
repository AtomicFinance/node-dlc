import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { IDlcMessage } from './DlcMessage';

/**
 * One enum outcome whose CET pays `scriptPubkey` in place of the offerer's
 * payout script.
 */
export interface IPayoutScriptOverride {
  /** The outcome string exactly as it appears in the contract descriptor. */
  outcome: string;
  /** The script the offerer's output pays for this outcome. */
  scriptPubkey: Buffer;
}

/**
 * The PayoutScriptOverrides TLV names the enum outcomes on a DlcOffer whose
 * CET pays a script other than the offerer's. A lending product uses it for
 * a `liquidated-by-0x…` outcome that pays the liquidator's Bitcoin address.
 *
 * Amounts are untouched: the descriptor still says `offer = total, accept = 0`
 * for such an outcome, and only the offerer's output script is swapped.
 *
 * Wire format matches the ddk-messages `PayoutScriptOverrides` record:
 * BigSize count, then per entry a BigSize-prefixed UTF-8 outcome and a
 * u16-prefixed script.
 */
export class PayoutScriptOverrides implements IDlcMessage {
  public static type = MessageType.PayoutScriptOverrides;

  public static deserialize(buf: Buffer): PayoutScriptOverrides {
    const instance = new PayoutScriptOverrides();
    const { body } = deserializeTlv(new BufferReader(buf));
    const reader = new BufferReader(body);

    const count = Number(reader.readBigSize());
    for (let i = 0; i < count; i++) {
      const outcomeLength = Number(reader.readBigSize());
      const outcome = reader.readBytes(outcomeLength).toString('utf8');
      const scriptLength = reader.readUInt16BE();
      const scriptPubkey = reader.readBytes(scriptLength);
      instance.overrides.push({ outcome, scriptPubkey });
    }

    return instance;
  }

  public type = PayoutScriptOverrides.type;

  public overrides: IPayoutScriptOverride[] = [];

  /** The override script for `outcome`, if the record names it. */
  public scriptFor(outcome: string): Buffer | undefined {
    return this.overrides.find((o) => o.outcome === outcome)?.scriptPubkey;
  }

  public toJSON(): IPayoutScriptOverridesJSON {
    return {
      type: this.type,
      overrides: this.overrides.map((o) => ({
        outcome: o.outcome,
        scriptPubkey: o.scriptPubkey.toString('hex'),
      })),
    };
  }

  public serialize(): Buffer {
    const body = new BufferWriter();
    body.writeBigSize(this.overrides.length);
    for (const o of this.overrides) {
      const outcome = Buffer.from(o.outcome, 'utf8');
      body.writeBigSize(outcome.length);
      body.writeBytes(outcome);
      body.writeUInt16BE(o.scriptPubkey.length);
      body.writeBytes(o.scriptPubkey);
    }

    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(body.size);
    writer.writeBytes(body.toBuffer());
    return writer.toBuffer();
  }
}

export interface IPayoutScriptOverridesJSON {
  type: number;
  overrides: { outcome: string; scriptPubkey: string }[];
}
