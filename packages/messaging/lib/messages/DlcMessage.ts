import { MessageType } from "../MessageType";

export interface IDlcMessage {
    type: MessageType;
    serialize(): Buffer;
}
