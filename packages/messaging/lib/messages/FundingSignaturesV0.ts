import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { IScriptWitnessV0JSON, ScriptWitnessV0 } from './ScriptWitnessV0';

/**
 * FundingSignatures V0 contains signatures of the funding transaction
 * and any necessary information linking the signatures to their inputs.
 */
export class FundingSignaturesV0 implements IDlcMessage {
  public static type = MessageType.FundingSignaturesV0;

  /**
   * Deserializes an funding_signatures_v0 message
   * @param buf
   */
  public static deserialize(buf: Buffer): FundingSignaturesV0 {
    const instance = new FundingSignaturesV0();
    const reader = new BufferReader(buf);

    // reader.readBigSize(); // read type
    // instance.length = reader.readBigSize();
    const numWitnesses = Number(reader.readBigSize());

    for (let i = 0; i < numWitnesses; i++) {
      const numWitnessElements = Number(reader.readBigSize());
      const witnessElements: ScriptWitnessV0[] = [];
      for (let j = 0; j < numWitnessElements; j++) {
        // Read witness element directly: [bigsize:len][len*byte:witness]
        const witnessLength = Number(reader.readBigSize());
        const witnessBytes = reader.readBytes(witnessLength);

        const witness = new ScriptWitnessV0();
        witness.length = witnessLength;
        witness.witness = witnessBytes;
        witnessElements.push(witness);
      }
      instance.witnessElements.push(witnessElements);
    }

    return instance;
  }

  /**
   * The type for funding_signatures_v0 message. funding_signatures_v0 = 42776
   */
  public type = FundingSignaturesV0.type;

  public length: bigint;

  public witnessElements: ScriptWitnessV0[][] = [];

  /**
   * Converts funding_signatures_v0 to JSON (canonical rust-dlc format)
   */
  public toJSON(): IFundingSignaturesV0JSON {
    return {
      fundingSignatures: this.witnessElements.map((witnessElement) => {
        return {
          witnessElements: witnessElement.map((witness) => witness.toJSON()),
        };
      }),
    };
  }

  /**
   * Serializes the funding_signatures_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    // writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();

    dataWriter.writeBigSize(this.witnessElements.length);

    for (const witnessElements of this.witnessElements) {
      dataWriter.writeBigSize(witnessElements.length);
      for (const witnessElement of witnessElements) {
        dataWriter.writeBytes(witnessElement.serialize());
      }
    }

    // writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IFundingSignaturesV0JSON {
  fundingSignatures: IFundingSignatureJSON[];
}

export interface IFundingSignatureJSON {
  witnessElements: IScriptWitnessV0JSON[];
}
