import { BufferReader, BufferWriter } from '@node-dlc/bufio';

import { IOrderOfferJSON, OrderOffer } from './OrderOffer';

/**
 * Order negotiation fields for order contract negotiation.
 * Follows the same pattern as NegotiationFields with Single and Disjoint variants.
 */
export abstract class OrderNegotiationFields {
  public static deserialize(buf: Buffer): OrderNegotiationFields {
    const reader = new BufferReader(buf);
    const discriminator = Number(reader.readBigSize());

    switch (discriminator) {
      case 0:
        return SingleOrderNegotiationFields.deserialize(buf);
      case 1:
        return DisjointOrderNegotiationFields.deserialize(buf);
      default:
        throw new Error(
          `Invalid OrderNegotiationFields discriminator: ${discriminator}. Must be 0 (Single) or 1 (Disjoint)`,
        );
    }
  }

  /**
   * Creates OrderNegotiationFields from JSON data
   * @param json JSON object representing order negotiation fields
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): OrderNegotiationFields {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON input for OrderNegotiationFields');
    }

    const variant = json.variant;

    switch (variant) {
      case 'Single':
        return SingleOrderNegotiationFields.fromJSON(json);
      case 'Disjoint':
        return DisjointOrderNegotiationFields.fromJSON(json);
      default:
        throw new Error(
          `Unknown order negotiation fields variant: ${variant}. Must be 'Single' or 'Disjoint'`,
        );
    }
  }

  public abstract variant: 'Single' | 'Disjoint';
  public abstract discriminator: number;
  public abstract serialize(): Buffer;
  public abstract toJSON(): IOrderNegotiationFieldsJSON;
}

/**
 * Order negotiation fields for contract based on a single event (basic/empty).
 */
export class SingleOrderNegotiationFields extends OrderNegotiationFields {
  /**
   * Creates a SingleOrderNegotiationFields from JSON data
   * @param json JSON object representing single order negotiation fields
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): SingleOrderNegotiationFields {
    const instance = new SingleOrderNegotiationFields();

    if (json.variant !== 'Single') {
      throw new Error(
        `Invalid variant for SingleOrderNegotiationFields: expected 'Single', got ${json.variant}`,
      );
    }

    // Single order negotiation fields are currently empty/basic
    return instance;
  }

  /**
   * Deserializes single order negotiation fields
   * @param buf
   */
  public static deserialize(buf: Buffer): SingleOrderNegotiationFields {
    const instance = new SingleOrderNegotiationFields();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read discriminator (0)
    // Single order negotiation fields are currently empty

    return instance;
  }

  public variant: 'Single' = 'Single';
  public discriminator = 0;

  /**
   * Converts single order negotiation fields to JSON
   */
  public toJSON(): ISingleOrderNegotiationFieldsJSON {
    return {
      variant: this.variant,
    };
  }

  /**
   * Serializes the single order negotiation fields into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.discriminator);
    // Single order negotiation fields are currently empty

    return writer.toBuffer();
  }
}

/**
 * Order negotiation fields for contract based on multiple events.
 */
export class DisjointOrderNegotiationFields extends OrderNegotiationFields {
  /**
   * Creates a DisjointOrderNegotiationFields from JSON data
   * @param json JSON object representing disjoint order negotiation fields
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
  public static fromJSON(json: any): DisjointOrderNegotiationFields {
    const instance = new DisjointOrderNegotiationFields();

    if (json.variant !== 'Disjoint') {
      throw new Error(
        `Invalid variant for DisjointOrderNegotiationFields: expected 'Disjoint', got ${json.variant}`,
      );
    }

    if (!json.orderOffer) {
      throw new Error(
        'DisjointOrderNegotiationFields requires orderOffer field',
      );
    }

    instance.orderOffer = OrderOffer.fromJSON
      ? OrderOffer.fromJSON(json.orderOffer)
      : OrderOffer.deserialize(Buffer.from(json.orderOffer, 'hex'));

    return instance;
  }

  /**
   * Deserializes disjoint order negotiation fields
   * @param buf
   */
  public static deserialize(buf: Buffer): DisjointOrderNegotiationFields {
    const instance = new DisjointOrderNegotiationFields();
    const reader = new BufferReader(buf);

    reader.readBigSize(); // read discriminator (1)
    const orderOfferLength = reader.readBigSize();
    const orderOfferBuf = reader.readBytes(Number(orderOfferLength));
    instance.orderOffer = OrderOffer.deserialize(orderOfferBuf);

    return instance;
  }

  public variant: 'Disjoint' = 'Disjoint';
  public discriminator = 1;
  public orderOffer: OrderOffer;

  /**
   * Converts disjoint order negotiation fields to JSON
   */
  public toJSON(): IDisjointOrderNegotiationFieldsJSON {
    return {
      variant: this.variant,
      orderOffer: this.orderOffer.toJSON(),
    };
  }

  /**
   * Serializes the disjoint order negotiation fields into a Buffer
   */
  public serialize(): Buffer {
    const writer = new BufferWriter();
    writer.writeBigSize(this.discriminator);

    const orderOfferData = this.orderOffer.serialize();
    writer.writeBigSize(orderOfferData.length);
    writer.writeBytes(orderOfferData);

    return writer.toBuffer();
  }
}

export type IOrderNegotiationFieldsJSON =
  | ISingleOrderNegotiationFieldsJSON
  | IDisjointOrderNegotiationFieldsJSON;

export interface ISingleOrderNegotiationFieldsJSON {
  variant: 'Single';
}

export interface IDisjointOrderNegotiationFieldsJSON {
  variant: 'Disjoint';
  orderOffer: IOrderOfferJSON;
}

// Legacy exports for backward compatibility - map to new structure
export const OrderNegotiationFieldsV0 = SingleOrderNegotiationFields; // V0 was basic/empty
export const OrderNegotiationFieldsV1 = DisjointOrderNegotiationFields; // V1 had OrderOffer

export type IOrderNegotiationFieldsV0JSON = ISingleOrderNegotiationFieldsJSON;
export type IOrderNegotiationFieldsV1JSON = IDisjointOrderNegotiationFieldsJSON;
