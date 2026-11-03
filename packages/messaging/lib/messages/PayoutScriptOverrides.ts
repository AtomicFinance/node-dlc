import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { deserializeTlv } from '../serialize/deserializeTlv';
import { IDlcMessage } from './DlcMessage';

/** An outcome of an enum descriptor, exactly as the descriptor names it. */
export interface IEnumOverrideOutcome {
  type: 'enum';
  outcome: string;
}

/** The values of a numeric descriptor from `start` to `end`, both included. */
export interface INumericOverrideOutcome {
  type: 'numeric';
  start: bigint;
  end: bigint;
}

export type OverrideOutcome = IEnumOverrideOutcome | INumericOverrideOutcome;

const ENUM_VARIANT = 0;
const NUMERIC_VARIANT = 1;

/**
 * The CETs of `outcome` pay `scriptPubkey` in place of the accepter's payout
 * script.
 */
export interface IPayoutScriptOverride {
  outcome: OverrideOutcome;
  /** The script the accepter's output pays for those outcomes. */
  scriptPubkey: Buffer;
}

/**
 * The PayoutScriptOverrides TLV names the outcomes on a DlcOffer whose CETs
 * pay a script other than the accepter's: an outcome of an enum descriptor,
 * or a range of the values of a numeric one. A lending product uses it for a
 * liquidation outcome that pays the liquidator in the lender's place.
 *
 * Amounts are untouched. An outcome that pays the whole collateral to the
 * third party is written `offer = 0, accept = total` in the descriptor, and
 * only the accepter's output script is swapped.
 *
 * Wire format matches the dlc-messages `PayoutScriptOverrides` record in
 * dlcdevkit: a BigSize count, then per entry a u8 variant (0 enum, 1 numeric),
 * the variant body (a BigSize-prefixed UTF-8 outcome, or `start` and `end` as
 * u64), and a u16-prefixed script.
 *
 * The record redirects what the accepter is paid and comes from the offerer,
 * so an accepter has to check it before accepting the offer. Which CETs a
 * numeric range covers is decided where the CETs are built; `validate` only
 * checks what the record says on its own.
 */
export class PayoutScriptOverrides implements IDlcMessage {
  public static type = MessageType.PayoutScriptOverrides;

  public static deserialize(buf: Buffer): PayoutScriptOverrides {
    const instance = new PayoutScriptOverrides();
    const { type, body } = deserializeTlv(new BufferReader(buf));
    if (type !== BigInt(PayoutScriptOverrides.type)) {
      throw new Error(`Expected TLV type ${PayoutScriptOverrides.type}`);
    }
    const reader = new BufferReader(body);

    const count = Number(reader.readBigSize());
    for (let i = 0; i < count; i++) {
      const variant = reader.readUInt8();
      let outcome: OverrideOutcome;
      if (variant === ENUM_VARIANT) {
        const outcomeLength = Number(reader.readBigSize());
        outcome = {
          type: 'enum',
          outcome: reader.readBytes(outcomeLength).toString('utf8'),
        };
      } else if (variant === NUMERIC_VARIANT) {
        outcome = {
          type: 'numeric',
          start: reader.readUInt64BE(),
          end: reader.readUInt64BE(),
        };
      } else {
        throw new Error(`Unknown payout override outcome variant ${variant}`);
      }
      const scriptLength = reader.readUInt16BE();
      const scriptPubkey = reader.readBytes(scriptLength);
      instance.overrides.push({ outcome, scriptPubkey });
    }

    if (!reader.eof) {
      throw new Error('Trailing bytes after PayoutScriptOverrides');
    }

    return instance;
  }

  public type = PayoutScriptOverrides.type;

  public overrides: IPayoutScriptOverride[] = [];

  /** The override script for an enum `outcome`, if the record names it. */
  public scriptForEnumOutcome(outcome: string): Buffer | undefined {
    return this.overrides.find(
      (o) => o.outcome.type === 'enum' && o.outcome.outcome === outcome,
    )?.scriptPubkey;
  }

  /**
   * The length of the longest script a CET may pay the accepter: its payout
   * script or any override script. The funding transaction reserves the CET
   * fee for the accepter's output at this length, as dlcdevkit does.
   */
  public acceptPayoutScriptLen(acceptPayoutSpk: Buffer): number {
    return this.overrides.reduce(
      (len, o) => Math.max(len, o.scriptPubkey.length),
      acceptPayoutSpk.length,
    );
  }

  /**
   * Checks what the record says on its own: every script is non-empty and
   * fits a u16 length, and no numeric range starts after it ends. Checks
   * against the contract are `DlcOffer.validate`'s.
   */
  public validate(): void {
    for (const o of this.overrides) {
      if (o.scriptPubkey.length === 0) {
        throw new Error('Payout override script must not be empty');
      }
      if (o.scriptPubkey.length > 0xffff) {
        throw new Error('Payout override script is too long');
      }
      if (o.outcome.type === 'numeric' && o.outcome.start > o.outcome.end) {
        throw new Error(
          `Payout override range starts after it ends: ${o.outcome.start} > ${o.outcome.end}`,
        );
      }
    }
  }

  public toJSON(): IPayoutScriptOverridesJSON {
    return {
      type: this.type,
      overrides: this.overrides.map((o) => ({
        outcome:
          o.outcome.type === 'enum'
            ? { enum: { outcome: o.outcome.outcome } }
            : {
                numeric: {
                  start: o.outcome.start.toString(),
                  end: o.outcome.end.toString(),
                },
              },
        scriptPubkey: o.scriptPubkey.toString('hex'),
      })),
    };
  }

  public serialize(): Buffer {
    const body = new BufferWriter();
    body.writeBigSize(this.overrides.length);
    for (const o of this.overrides) {
      if (o.outcome.type === 'enum') {
        const outcome = Buffer.from(o.outcome.outcome, 'utf8');
        body.writeUInt8(ENUM_VARIANT);
        body.writeBigSize(outcome.length);
        body.writeBytes(outcome);
      } else {
        body.writeUInt8(NUMERIC_VARIANT);
        body.writeUInt64BE(o.outcome.start);
        body.writeUInt64BE(o.outcome.end);
      }
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
  overrides: {
    outcome:
      | { enum: { outcome: string } }
      | { numeric: { start: string; end: string } };
    scriptPubkey: string;
  }[];
}
