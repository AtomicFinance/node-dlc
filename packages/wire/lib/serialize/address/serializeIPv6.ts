import { BufferWriter } from "@node-dlc/bufio";
import { AddressIPv6 } from "../../domain/AddressIPv6";
import { ipv6StringToBuffer } from "./ipv6StringToBuffer";

/**
 * Serializes an IPv6 address in a Buffer that can be sent
 * over the wire.
 */
export function serializeIPv6(address: AddressIPv6): Buffer {
    const writer = new BufferWriter(Buffer.alloc(19));

    const hostBytes = ipv6StringToBuffer(address.host);

    writer.writeUInt8(address.type);
    writer.writeBytes(hostBytes);
    writer.writeUInt16BE(address.port);

    return writer.toBuffer();
}
