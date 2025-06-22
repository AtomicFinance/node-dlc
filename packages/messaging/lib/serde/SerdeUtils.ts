import { F64 } from '@node-dlc/bufio';

// Field transformation options (similar to serde attributes)
export interface SerdeFieldOptions {
  rename?: string; // For mapping different field names
  aliases?: string[]; // For handling multiple field name variations during deserialization
  transform?: {
    serialize?: (value: any) => any;
    deserialize?: (value: any) => any;
  };
  optional?: boolean;
  type?:
    | 'hex'
    | 'bigint'
    | 'f64'
    | 'buffer'
    | 'array'
    | 'object'
    | 'der_signature';
  itemType?: string; // For arrays of complex objects
}

// Utility functions similar to Rust serde helpers
export class SerdeHelpers {
  // Equivalent to serialize_hex helper in Rust
  static serializeHex(value: Buffer): string {
    return value.toString('hex');
  }

  // Equivalent to deserialize_hex_string helper in Rust
  static deserializeHex(value: string): Buffer {
    return Buffer.from(value, 'hex');
  }

  // Safe BigInt conversion (handles json-bigint compatibility)
  static toBigInt(value: any): bigint {
    if (value === null || value === undefined) return BigInt(0);
    if (typeof value === 'bigint') return value;
    if (typeof value === 'string') return BigInt(value);
    if (typeof value === 'number') return BigInt(value);
    return BigInt(0);
  }

  // Safe BigInt to number conversion (preserves precision)
  static bigIntToNumber(value: bigint): number {
    if (
      value <= BigInt(Number.MAX_SAFE_INTEGER) &&
      value >= BigInt(Number.MIN_SAFE_INTEGER)
    ) {
      return Number(value);
    }
    // For larger values, preserve as BigInt (json-bigint will handle serialization)
    return value as any;
  }

  // F64 parsing (handles string/number precision issues)
  static parseF64(value: any): F64 | null {
    if (value === null || value === undefined) return null;

    try {
      if (typeof value === 'string') {
        try {
          return F64.fromString(value);
        } catch {
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && isFinite(numValue)) {
            return F64.fromNumber(numValue);
          }
        }
      } else if (typeof value === 'number') {
        if (!isFinite(value)) return null;
        return F64.fromNumber(value);
      }

      const numValue = Number(value);
      if (!isNaN(numValue) && isFinite(numValue)) {
        return F64.fromNumber(numValue);
      }
      return null;
    } catch {
      return null;
    }
  }

  // F64 serialization to number or string based on precision needs
  static serializeF64(value: F64): number | string {
    try {
      const numValue = value.toNumber();
      // If we can represent it as a safe number, do so
      if (Number.isSafeInteger(numValue) || Math.abs(numValue) < 1e15) {
        return numValue;
      }
      // Otherwise, use string representation for precision
      return value.toString();
    } catch {
      return value.toString();
    }
  }

  // Field name resolution with aliases (handles snake_case/camelCase variations)
  static resolveFieldValue(
    json: any,
    fieldName: string,
    aliases: string[] = [],
  ): any {
    if (json[fieldName] !== undefined) return json[fieldName];

    for (const alias of aliases) {
      if (json[alias] !== undefined) return json[alias];
    }

    return undefined;
  }

  // Convert field name based on naming convention
  static convertFieldName(
    fieldName: string,
    convention: 'camelCase' | 'snake_case',
  ): string {
    switch (convention) {
      case 'snake_case':
        return fieldName.replace(
          /[A-Z]/g,
          (letter) => `_${letter.toLowerCase()}`,
        );
      case 'camelCase':
      default:
        return fieldName;
    }
  }

  // Parse DER signature to raw format (common pattern in DLC messages)
  static parseDerSignature(hexSig: string): Buffer {
    const sigBuffer = Buffer.from(hexSig, 'hex');

    if (sigBuffer.length === 64) {
      return sigBuffer; // Already raw format
    }

    try {
      // Import secp256k1 dynamically to avoid circular dependencies
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const secp256k1 = require('secp256k1');
      const rawSig = secp256k1.signatureImport(sigBuffer);
      return Buffer.from(rawSig);
    } catch (ex) {
      throw new Error(`Invalid DER signature: ${(ex as Error).message}`);
    }
  }

  // Convert raw signature to DER format (for canonical JSON output)
  static serializeDerSignature(rawSig: Buffer): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const secp256k1 = require('secp256k1');
      const derSig = secp256k1.signatureExport(rawSig);
      return Buffer.from(derSig).toString('hex');
    } catch (ex) {
      throw new Error(`Invalid raw signature: ${(ex as Error).message}`);
    }
  }

  // Get standard field aliases for a field name (handles common variations)
  static getStandardAliases(fieldName: string): string[] {
    const aliases: string[] = [];

    // Add snake_case variant
    aliases.push(SerdeHelpers.convertFieldName(fieldName, 'snake_case'));

    // Handle specific common DLC field variations
    const fieldVariations: Record<string, string[]> = {
      fundingPubkey: ['fundingPubKey', 'funding_pubkey'],
      payoutSpk: ['payoutSPK', 'payout_spk'],
      changeSpk: ['changeSPK', 'change_spk'],
      offerCollateral: ['offerCollateralSatoshis', 'offer_collateral'],
      acceptCollateral: ['acceptCollateralSatoshis', 'accept_collateral'],
      temporaryContractId: ['temporary_contract_id'],
      contractFlags: ['contract_flags'],
      chainHash: ['chain_hash'],
      contractInfo: ['contract_info'],
      fundingInputs: ['funding_inputs'],
      payoutSerialId: ['payout_serial_id'],
      changeSerialId: ['change_serial_id'],
      fundOutputSerialId: ['fund_output_serial_id'],
      feeRatePerVb: ['fee_rate_per_vb'],
      cetLocktime: ['cet_locktime'],
      refundLocktime: ['refund_locktime'],
      refundSignature: ['refund_signature'],
      cetAdaptorSignatures: ['cet_adaptor_signatures'],
      negotiationFields: ['negotiation_fields'],
    };

    if (fieldVariations[fieldName]) {
      aliases.push(...fieldVariations[fieldName]);
    }

    return aliases;
  }
}

// Field mapping configuration type
export interface FieldMapping {
  [propertyName: string]: SerdeFieldOptions;
}

// Base class that provides standardized fromJSON and toJSON using explicit field mappings
export abstract class SerdeBase {
  // Abstract method that subclasses must implement to define their field mappings
  protected abstract getFieldMappings(): FieldMapping;

  // Generic fromJSON that uses field mappings for deserialization
  public static fromJSONWithMapping<T extends SerdeBase>(
    json: any,
    instance: T,
    fieldMappings: FieldMapping,
  ): T {
    for (const [propKey, options] of Object.entries(fieldMappings)) {
      let aliases = options.aliases || [];

      // Add standard aliases if not explicitly provided
      if (aliases.length === 0) {
        aliases = SerdeHelpers.getStandardAliases(propKey);
      }

      // Add renamed field name
      if (options.rename) {
        aliases.unshift(options.rename);
      }

      const value = SerdeHelpers.resolveFieldValue(json, propKey, aliases);

      if (value === undefined && !options.optional) {
        if (options.type === 'bigint') {
          (instance as any)[propKey] = BigInt(0);
          continue;
        }
      }

      if (value !== undefined) {
        let transformedValue = value;

        // Apply custom deserialize transformation first
        if (options.transform?.deserialize) {
          transformedValue = options.transform.deserialize(value);
        }
        // Apply type-specific transformations
        else if (options.type) {
          switch (options.type) {
            case 'hex':
              transformedValue = SerdeHelpers.deserializeHex(value);
              break;
            case 'bigint':
              transformedValue = SerdeHelpers.toBigInt(value);
              break;
            case 'f64':
              transformedValue = SerdeHelpers.parseF64(value);
              break;
            case 'buffer':
              transformedValue = Buffer.from(value, 'hex');
              break;
            case 'der_signature':
              transformedValue = SerdeHelpers.parseDerSignature(value);
              break;
            case 'array':
              // Handle arrays with specific item types
              if (Array.isArray(value)) {
                transformedValue = value.map((item: any) => {
                  if (options.itemType && item.fromJSON) {
                    // Use the class's fromJSON method if available
                    return item.fromJSON ? item.fromJSON(item) : item;
                  }
                  return item;
                });
              }
              break;
            case 'object':
              // For complex objects, try to use their fromJSON if available
              if (value && typeof value === 'object' && options.itemType) {
                // Dynamic import of the class and call fromJSON
                transformedValue = value;
              }
              break;
          }
        }

        (instance as any)[propKey] = transformedValue;
      }
    }

    return instance;
  }

  // Generic toJSON using field mappings for serialization
  toJSON(): any {
    const result: any = {};
    const fieldMappings = this.getFieldMappings();

    for (const [propKey, options] of Object.entries(fieldMappings)) {
      const value = (this as any)[propKey];

      if (value === undefined && options.optional) {
        continue; // Skip optional undefined fields
      }

      let serializedValue = value;

      // Apply custom serialize transformation first
      if (options.transform?.serialize) {
        serializedValue = options.transform.serialize(value);
      }
      // Apply type-specific transformations
      else if (options.type && value !== undefined && value !== null) {
        switch (options.type) {
          case 'hex':
          case 'buffer':
            serializedValue = SerdeHelpers.serializeHex(value);
            break;
          case 'bigint':
            serializedValue = SerdeHelpers.bigIntToNumber(value);
            break;
          case 'f64':
            serializedValue = SerdeHelpers.serializeF64(value);
            break;
          case 'der_signature':
            serializedValue = SerdeHelpers.serializeDerSignature(value);
            break;
          case 'array':
            if (Array.isArray(value)) {
              serializedValue = value.map((item: any) => {
                return item && typeof item.toJSON === 'function'
                  ? item.toJSON()
                  : item;
              });
            }
            break;
          case 'object':
            if (value && typeof value.toJSON === 'function') {
              serializedValue = value.toJSON();
            }
            break;
        }
      }

      // Use renamed field name if specified, otherwise use original property name
      const fieldName = options.rename || propKey;
      result[fieldName] = serializedValue;
    }

    return result;
  }
}

// Helper functions for creating field configurations (similar to decorators)
export const field = (options: SerdeFieldOptions = {}): SerdeFieldOptions =>
  options;

// Common field type helpers
export const HexField = (aliases: string[] = []): SerdeFieldOptions => ({
  type: 'hex',
  aliases,
});

export const BigIntField = (aliases: string[] = []): SerdeFieldOptions => ({
  type: 'bigint',
  aliases,
});

export const F64Field = (aliases: string[] = []): SerdeFieldOptions => ({
  type: 'f64',
  aliases,
});

export const BufferField = (aliases: string[] = []): SerdeFieldOptions => ({
  type: 'buffer',
  aliases,
});

export const DerSignatureField = (
  aliases: string[] = [],
): SerdeFieldOptions => ({
  type: 'der_signature',
  aliases,
});

export const ArrayField = (
  itemType?: string,
  aliases: string[] = [],
): SerdeFieldOptions => ({
  type: 'array',
  itemType,
  aliases,
});

export const ObjectField = (
  itemType?: string,
  aliases: string[] = [],
): SerdeFieldOptions => ({
  type: 'object',
  itemType,
  aliases,
});

export const OptionalField = (
  type: SerdeFieldOptions['type'],
  aliases: string[] = [],
): SerdeFieldOptions => ({
  type,
  optional: true,
  aliases,
});

// Common DLC field configurations
export const DlcFields = {
  protocolVersion: field({ type: 'bigint', aliases: ['protocol_version'] }),
  temporaryContractId: HexField(['temporary_contract_id']),
  contractFlags: HexField(['contract_flags']),
  chainHash: HexField(['chain_hash']),
  fundingPubkey: HexField(['fundingPubKey', 'funding_pubkey']),
  payoutSpk: HexField(['payoutSPK', 'payout_spk']),
  changeSpk: HexField(['changeSPK', 'change_spk']),
  payoutSerialId: BigIntField(['payout_serial_id']),
  changeSerialId: BigIntField(['change_serial_id']),
  fundOutputSerialId: BigIntField(['fund_output_serial_id']),
  feeRatePerVb: BigIntField(['fee_rate_per_vb']),
  cetLocktime: field({ aliases: ['cet_locktime'] }),
  refundLocktime: field({ aliases: ['refund_locktime'] }),
  offerCollateral: BigIntField(['offerCollateralSatoshis', 'offer_collateral']),
  acceptCollateral: BigIntField([
    'acceptCollateralSatoshis',
    'accept_collateral',
  ]),
  refundSignature: DerSignatureField(['refund_signature']),
  fundingInputs: ArrayField('FundingInput', ['funding_inputs']),
  cetAdaptorSignatures: ObjectField('CetAdaptorSignatures', [
    'cet_adaptor_signatures',
  ]),
  negotiationFields: OptionalField('object', ['negotiation_fields']),
};
