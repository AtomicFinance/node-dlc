import { BufferReader, BufferWriter } from '@node-dlc/bufio';

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
  public static deserialize(buf: Buffer): CetAdaptorSignaturesV0 {
    const instance = new CetAdaptorSignaturesV0();
    const reader = new BufferReader(buf);

    const nbSignatures = Number(reader.readBigSize()); // nb_signatures

    // Read exactly nbSignatures * (65 + 97) bytes to match serialize format
    for (let i = 0; i < nbSignatures; i++) {
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
   * Converts cet_adaptor_signature to JSON (canonical rust-dlc format)
   */
  public toJSON(): ICetAdaptorSignaturesV0JSON {
    return {
      ecdsaAdaptorSignatures: this.sigs.map((sig) => {
        // Combine encryptedSig and dleqProof into single signature field as expected by rust-dlc
        const signature = Buffer.concat([sig.encryptedSig, sig.dleqProof]);
        return {
          signature: signature.toString('hex'),
        };
      }),
    };
  }

  /**
   * Serializes the cet_adaptor_signature message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    // writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeBigSize(this.sigs.length);

    for (const sig of this.sigs) {
      dataWriter.writeBytes(sig.encryptedSig);
      dataWriter.writeBytes(sig.dleqProof);
    }

    // writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());
    return writer.toBuffer();
  }
}

interface ISig {
  encryptedSig: Buffer;
  dleqProof: Buffer;
}

export interface ICetAdaptorSignaturesV0JSON {
  ecdsaAdaptorSignatures: ISigJSON[];
}

export interface ISigJSON {
  signature: string;
}
