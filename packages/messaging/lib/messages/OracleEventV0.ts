import { BufferReader, BufferWriter } from '@node-lightning/bufio';

import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import {
  DigitDecompositionEventDescriptorV0,
  EventDescriptor,
  IDigitDecompositionEventDescriptorV0JSON,
  IEnumEventDescriptorV0JSON,
} from './EventDescriptor';

/**
 * For users to be able to create DLCs based on a given event, they also
 * need to obtain information about the oracle and the time at which it
 * plans on releasing a signature over the event outcome. OracleEvent
 * mesages contain such information, which includes:
 *   - the nonce(s) that will be used to sign the event outcome(s)
 *   - the earliest time (UTC) at which it plans on releasing a signature
 *     over the event outcome, in epoch seconds
 *   - the event descriptor
 *   - the event ID which can be a name or categorization associated with
 *     the event by the oracle
 */
export class OracleEventV0 implements IDlcMessage {
  public static type = MessageType.OracleEventV0;

  /**
   * Deserializes an oracle_event message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleEventV0 {
    const instance = new OracleEventV0();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read type
    instance.length = reader.readBigSize();
    const nonceCount = reader.readUInt16BE();

    for (let i = 0; i < nonceCount; i++) {
      instance.oracleNonces.push(reader.readBytes(32));
    }

    instance.eventMaturityEpoch = reader.readUInt32BE();
    instance.eventDescriptor = EventDescriptor.deserialize(getTlv(reader));
    const eventIdLength = reader.readBigSize();
    const eventIdBuf = reader.readBytes(Number(eventIdLength));
    instance.eventId = eventIdBuf.toString();

    return instance;
  }

  /**
   * The type for oracle_event message. oracle_event = 55330
   */
  public type = OracleEventV0.type;

  public length: bigint;

  public oracleNonces: Buffer[] = [];

  public eventMaturityEpoch: number;

  public eventDescriptor: EventDescriptor;

  public eventId: string;

  /**
   * Validates correctness of all fields in the message
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Oracle.md
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    if (this.eventMaturityEpoch < 0) {
      throw new Error('eventMaturityEpoch must be greater than or equal to 0');
    }

    if (
      this.eventDescriptor.type === DigitDecompositionEventDescriptorV0.type
    ) {
      const eventDescriptor = this
        .eventDescriptor as DigitDecompositionEventDescriptorV0;

      eventDescriptor.validate();

      if (eventDescriptor.nbDigits !== this.oracleNonces.length) {
        throw Error(
          'OracleEvent oracleNonces length must match DigitDecompositionEventDescriptor nbDigits',
        );
      }
    }
  }

  /**
   * Converts oracle_event to JSON
   */
  public toJSON(): IOracleEventV0JSON {
    return {
      oracleNonces: this.oracleNonces.map((oracle) => oracle.toString('hex')),
      eventMaturityEpoch: this.eventMaturityEpoch,
      eventDescriptor: this.eventDescriptor.toJSON(),
      eventId: this.eventId,
    };
  }

  /**
   * Serializes the oracle_event message into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.type);

    const dataWriter = new BufferWriter();
    dataWriter.writeUInt16BE(this.oracleNonces.length);

    for (const nonce of this.oracleNonces) {
      dataWriter.writeBytes(nonce);
    }

    dataWriter.writeUInt32BE(this.eventMaturityEpoch);
    dataWriter.writeBytes(this.eventDescriptor.serialize());
    dataWriter.writeBigSize(this.eventId.length);
    dataWriter.writeBytes(Buffer.from(this.eventId));

    writer.writeBigSize(dataWriter.size);
    writer.writeBytes(dataWriter.toBuffer());

    return writer.toBuffer();
  }
}

export interface IOracleEventV0JSON {
  oracleNonces: string[];
  eventMaturityEpoch: number;
  eventDescriptor:
    | IEnumEventDescriptorV0JSON
    | IDigitDecompositionEventDescriptorV0JSON;
  eventId: string;
}
