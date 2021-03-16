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
  public static deserialize(buf: Buffer): CetAdaptorSignaturesV0 {
    const instance = new CetAdaptorSignaturesV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
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
   * Serializes the cet_adaptor_signature message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);
    writer.writeBigSize(this.length);
    writer.writeBigSize(this.sigs.length);

    for (const sig of this.sigs) {
      writer.writeBytes(sig.encryptedSig);
      writer.writeBytes(sig.dleqProof);
    }

    return writer.toBuffer();
  }
}

interface ISig {
  encryptedSig: Buffer;
  dleqProof: Buffer;
}
