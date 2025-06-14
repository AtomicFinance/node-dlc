import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';
import { IScriptWitnessV0JSON, ScriptWitnessV0 } from './ScriptWitnessV0';

/**
 * FundingSignatures contains signatures of the funding transaction
 * and any necessary information linking the signatures to their inputs.
 */
export class FundingSignatures implements IDlcMessage {
  public static type = MessageType.FundingSignatures;

  /**
   * Deserializes a funding_signatures message
   * @param buf
   */
  public static deserialize(buf: Buffer): FundingSignatures {
    const instance = new FundingSignatures();
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
   * The type for funding_signatures message. funding_signatures = 42776
   */
  public type = FundingSignatures.type;

  public length: bigint;

  public witnessElements: ScriptWitnessV0[][] = [];

  /**
   * Converts funding_signatures to JSON (canonical rust-dlc format)
   */
  public toJSON(): IFundingSignaturesJSON {
    return {
      fundingSignatures: this.witnessElements.map((witnessElement) => {
        return {
          witnessElements: witnessElement.map((witness) => witness.toJSON()),
        };
      }),
    };
  }

  /**
   * Serializes the funding_signatures message into a Buffer
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

export interface IFundingSignaturesJSON {
  fundingSignatures: IFundingSignatureJSON[];
}

export interface IFundingSignatureJSON {
  witnessElements: IScriptWitnessV0JSON[];
}
