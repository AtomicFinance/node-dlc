import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { IDlcMessage } from './DlcMessage';
import { FundingSignaturesV0 } from './pre-163/FundingSignaturesV0';
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

    const numWitnesses = reader.readBigSize();

    for (let i = 0; i < numWitnesses; i++) {
      const numWitnessElements = reader.readBigSize();
      const witnessElements: ScriptWitness[] = [];
      for (let j = 0; j < numWitnessElements; j++) {
        const witness = ScriptWitness.getWitness(reader);
        witnessElements.push(ScriptWitness.deserialize(witness));
      }
      instance.witnessElements.push(witnessElements);
    }

    return instance;
  }

  public static fromPre163(
    fundingSignatures: FundingSignaturesV0,
  ): FundingSignatures {
    const instance = new FundingSignatures();

    instance.witnessElements = fundingSignatures.witnessElements;

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

    const dataWriter = new BufferWriter();

    dataWriter.writeBigSize(this.witnessElements.length);

    for (const witnessElements of this.witnessElements) {
      dataWriter.writeBigSize(witnessElements.length);
      for (const witnessElement of witnessElements) {
        dataWriter.writeBytes(witnessElement.serialize());
      }
    }

    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IWitnessElementsJSON {
  witnessElements: IScriptWitnessJSON[];
}

export interface IFundingSignaturesJSON {
  fundingSignatures: IWitnessElementsJSON[];
}
