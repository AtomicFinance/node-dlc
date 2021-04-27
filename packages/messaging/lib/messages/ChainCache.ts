// import { BufferReader, BufferWriter } from '@node-lightning/bufio';
// import { MessageType } from '../MessageType';
// import { IDlcMessage } from './DlcMessage';

// export class ChainCache implements IDlcMessage {
//   public static type = MessageType.ChainCache;

//   /**
//    * Deserializes an offer_dlc_v0 message
//    * @param buf
//    */
//   public static deserialize(buf: Buffer): ChainCache {
//     const instance = new ChainCache();
//     const reader = new BufferReader(buf);

//     reader.readUInt16BE(); // read type
//     instance.chainHash = reader.readBytes(32);
//     const hash = reader.readBytes(32);
//     const height = reader.readUInt32BE();
//     instance.bestBlock = {
//       hash,
//       height,
//     };
//     instance.active = reader.readUInt32BE();
//     instance.stopped = reader.readUInt32BE();

//     return instance;
//   }

//   /**
//    * The type for order_offer_v0 message. order_offer_v0 = 62770
//    */
//   public type = ChainCache.type;

//   public chainHash: Buffer;

//   public bestBlock: BlockEpoch;

//   public active: number;

//   public stopped: number;

//   /**
//    * Serializes the order_offer_v0 message into a Buffer
//    */
//   public serialize(): Buffer {
//     const writer = new BufferWriter();
//     writer.writeUInt16BE(this.type);
//     writer.writeBytes(this.chainHash);
//     writer.writeBytes(this.bestBlock.hash);
//     writer.writeUInt32BE(this.bestBlock.height);
//     writer.writeUInt32BE(this.active);
//     writer.writeUInt32BE(this.stopped);

//     return writer.toBuffer();
//   }
// }

// export interface BlockEpoch {
//   hash: Buffer;
//   height: number;
// }
