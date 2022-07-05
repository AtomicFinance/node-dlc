import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { IDlcMessage } from './DlcMessage';

/**
 * CetAdaptorSignatures V0 contains CET signatures and any necessary
 * information linking the signatures to their corresponding outcome
 */
export class CetAdaptorSignaturesV0 implements IDlcMessage {
  public static type = MessageType.CetAdaptorSignaturesV0;

  /**
   * Deserializes a cet_adaptor_signature_v0 message
   * @param buf
   */
  public static deserialize(
    reader: Buffer | BufferReader,
  ): CetAdaptorSignaturesV0 {
    if (reader instanceof Buffer) reader = new BufferReader(reader);

    const instance = new CetAdaptorSignaturesV0();

    reader.readBigSize(); // nb_signatures

    while (!reader.eof) {
      const encryptedSig = reader.readBytes(65);
      const dleqProof = reader.readBytes(97);
      instance.sigs.push({ encryptedSig, dleqProof });
    }

    return instance;
  }

  /**
   * The type for cet_adaptor_signature message. cet_adaptor_signature = 42774
   */
  public type = CetAdaptorSignaturesV0.type;

  public length: bigint;

  public sigs: ISig[] = [];

  /**
   * Converts cet_adaptor_signature to JSON
   */
  public toJSON(): ICetAdaptorSignaturesV0JSON {
    return {
      type: this.type,
      sigs: this.sigs.map((sig) => {
        return {
          encryptedSig: sig.encryptedSig.toString('hex'),
          dleqProof: sig.dleqProof.toString('hex'),
        };
      }),
    };
  }

  /**
   * Serializes the cet_adaptor_signature message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.sigs.length);

    for (const sig of this.sigs) {
      dataWriter.writeBytes(sig.encryptedSig);
      dataWriter.writeBytes(sig.dleqProof);
    }

    writer.writeBytes(dataWriter.toBuffer());
    return writer.toBuffer();
  }
}

interface ISig {
  encryptedSig: Buffer;
  dleqProof: Buffer;
}

export interface ICetAdaptorSignaturesV0JSON {
  type: number;
  sigs: ISigJSON[];
}

export interface ISigJSON {
  encryptedSig: string;
  dleqProof: string;
}
