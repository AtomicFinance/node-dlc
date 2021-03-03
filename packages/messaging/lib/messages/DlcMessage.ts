import { MessageType } from "../MessageType";

export interface DlcMessage {
    type: MessageType;
    serialize(): Buffer;
}
