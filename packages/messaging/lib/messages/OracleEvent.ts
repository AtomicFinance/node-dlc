import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { MessageType } from '../MessageType';
import { getTlv } from '../serialize/getTlv';
import { IDlcMessage } from './DlcMessage';
import {
  DigitDecompositionEventDescriptor,
  EnumEventDescriptor,
  EventDescriptor,
  IDigitDecompositionEventDescriptorJSON,
  IEnumEventDescriptorJSON,
} from './EventDescriptor';

/**
 * Oracle event containing information about an event and the way that the
 * oracle will attest to it. Updated to be rust-dlc compliant.
 *
 * For users to be able to create DLCs based on a given event, they also
 * need to obtain information about the oracle and the time at which it
 * plans on releasing a signature over the event outcome. OracleEvent
 * messages contain such information, which includes:
 *   - the nonce(s) that will be used to sign the event outcome(s)
 *   - the earliest time (UTC) at which it plans on releasing a signature
 *     over the event outcome, in epoch seconds
 *   - the event descriptor
 *   - the event ID which can be a name or categorization associated with
 *     the event by the oracle
 */
export class OracleEvent implements IDlcMessage {
  public static type = MessageType.OracleEvent;

  /**
   * Creates an OracleEvent from JSON data
   * @param json JSON object representing oracle event
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): OracleEvent {
    const instance = new OracleEvent();

    // Parse oracle nonces array
    const nonces = json.oracleNonces || json.oracle_nonces || [];
    instance.oracleNonces = nonces.map((nonce: string) =>
      Buffer.from(nonce, 'hex'),
    );

    instance.eventMaturityEpoch =
      json.eventMaturityEpoch || json.event_maturity_epoch || 0;

    // Parse event descriptor
    instance.eventDescriptor = EventDescriptor.fromJSON(
      json.eventDescriptor || json.event_descriptor,
    );

    instance.eventId = json.eventId || json.event_id || '';

    return instance;
  }

  /**
   * Deserializes an oracle_event message
   * @param buf
   */
  public static deserialize(buf: Buffer): OracleEvent {
    const instance = new OracleEvent();
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
  public type = OracleEvent.type;

  public length: bigint;

  /** The nonces that the oracle will use to attest to the event outcome. */
  public oracleNonces: Buffer[] = [];

  /** The expected maturity of the contract (Unix timestamp). */
  public eventMaturityEpoch: number;

  /** The description of the event. */
  public eventDescriptor: EventDescriptor;

  /** The ID of the event. */
  public eventId: string;

  /**
   * Validates correctness of all fields in the message according to rust-dlc specification.
   * This includes validating that the number of nonces matches the expected count for the event type.
   * https://github.com/discreetlogcontracts/dlcspecs/blob/master/Oracle.md
   * @throws Will throw an error if validation fails
   */
  public validate(): void {
    // Validate event maturity epoch
    if (this.eventMaturityEpoch < 0) {
      throw new Error('eventMaturityEpoch must be greater than or equal to 0');
    }

    // Validate event ID
    if (!this.eventId || this.eventId.length === 0) {
      throw new Error('eventId cannot be empty');
    }

    // Validate oracle nonces (must be 32 bytes each)
    if (this.oracleNonces.length === 0) {
      throw new Error('Must have at least one oracle nonce');
    }

    this.oracleNonces.forEach((nonce, index) => {
      if (!nonce || nonce.length !== 32) {
        throw new Error(`Oracle nonce at index ${index} must be 32 bytes`);
      }
    });

    // Validate expected number of nonces based on event descriptor type
    const expectedNbNonces = this.getExpectedNonceCount();

    if (expectedNbNonces !== this.oracleNonces.length) {
      throw new Error(
        `OracleEvent nonce count mismatch: expected ${expectedNbNonces}, got ${this.oracleNonces.length}`,
      );
    }

    // Validate the event descriptor itself
    if (this.eventDescriptor instanceof DigitDecompositionEventDescriptor) {
      this.eventDescriptor.validate();
    }
    // EnumEventDescriptorV0 doesn't have validation requirements beyond basic structure
  }

  /**
   * Returns the expected number of nonces based on the event descriptor type.
   * This matches the rust-dlc validation logic.
   */
  private getExpectedNonceCount(): number {
    if (this.eventDescriptor instanceof EnumEventDescriptor) {
      // Enum events require exactly 1 nonce
      return 1;
    } else if (
      this.eventDescriptor instanceof DigitDecompositionEventDescriptor
    ) {
      // Digit decomposition events require nbDigits nonces, plus 1 if signed
      const descriptor = this.eventDescriptor;
      return descriptor.isSigned
        ? descriptor.nbDigits + 1
        : descriptor.nbDigits;
    } else {
      throw new Error('Unknown event descriptor type');
    }
  }

  /**
   * Returns whether this event is for enumerated outcomes.
   */
  public isEnumEvent(): boolean {
    return this.eventDescriptor instanceof EnumEventDescriptor;
  }

  /**
   * Returns whether this event is for numerical outcomes.
   */
  public isDigitDecompositionEvent(): boolean {
    return this.eventDescriptor instanceof DigitDecompositionEventDescriptor;
  }

  /**
   * Returns the event descriptor as EnumEventDescriptor if it's an enum event.
   * @throws Error if not an enum event
   */
  public getEnumEventDescriptor(): EnumEventDescriptor {
    if (!this.isEnumEvent()) {
      throw new Error('Event is not an enum event');
    }
    return this.eventDescriptor as EnumEventDescriptor;
  }

  /**
   * Returns the event descriptor as DigitDecompositionEventDescriptor if it's a numerical event.
   * @throws Error if not a numerical event
   */
  public getDigitDecompositionEventDescriptor(): DigitDecompositionEventDescriptor {
    if (!this.isDigitDecompositionEvent()) {
      throw new Error('Event is not a digit decomposition event');
    }
    return this.eventDescriptor as DigitDecompositionEventDescriptor;
  }

  /**
   * Converts oracle_event to JSON
   */
  public toJSON(): IOracleEventJSON {
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

export interface IOracleEventJSON {
  type?: number; // Made optional for rust-dlc compatibility
  oracleNonces: string[];
  eventMaturityEpoch: number;
  eventDescriptor:
    | IEnumEventDescriptorJSON
    | IDigitDecompositionEventDescriptorJSON;
  eventId: string;
}
