import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { IDlcMessage } from './DlcMessage';
import { IScriptWitnessJSON, ScriptWitness } from './ScriptWitness';

/**
 * FundingSignatures V0 contains signatures of the funding transaction
 * and any necessary information linking the signatures to their inputs.
 */
export class FundingSignatures implements IDlcMessage {
  /**
   * Deserializes an funding_signatures_v0 message
   * @param buf
   */
  public static deserialize(reader: Buffer | BufferReader): FundingSignatures {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new FundingSignatures();

    const numWitnesses = reader.readUInt16BE();

    for (let i = 0; i < numWitnesses; i++) {
      const numWitnessElements = reader.readUInt16BE();
      const witnessElements: ScriptWitness[] = [];
      for (let j = 0; j < numWitnessElements; j++) {
        const witness = ScriptWitness.getWitness(reader);
        witnessElements.push(ScriptWitness.deserialize(witness));
      }
      instance.witnessElements.push(witnessElements);
    }

    return instance;
  }

  /**
   * The type for funding_signatures_v0 message. funding_signatures_v0 = 42776
   */
  public witnessElements: ScriptWitness[][] = [];

  /**
   * Converts funding_signatures_v0 to JSON
   */
  public toJSON(): IFundingSignaturesJSON {
    return {
      fundingSignatures: {
        witnessElements: this.witnessElements.map((witnessElement) => {
          return witnessElement.map((witness) => witness.toJSON());
        }),
      },
    };
  }

  /**
   * Serializes the funding_signatures_v0 message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    const dataWriter = new BufferWriter();

    dataWriter.writeUInt16BE(this.witnessElements.length);

    for (const witnessElements of this.witnessElements) {
      dataWriter.writeUInt16BE(witnessElements.length);
      for (const witnessElement of witnessElements) {
        dataWriter.writeBytes(witnessElement.serialize());
      }
    }

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IFundingSignaturesJSON {
  fundingSignatures: {
    witnessElements: IScriptWitnessJSON[][];
  };
}
