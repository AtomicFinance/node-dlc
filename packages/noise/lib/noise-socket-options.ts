import { ILogger } from "@node-dlc/logger";
import { Socket } from "net";
import { NoiseState } from "./noise-state";

export type NoiseSocketOptions = {
    /**
     * Standard TCP Socket from the net module that will be wrapped
     */
    socket: Socket;

    /**
     * State machine for noise connections that is injected into the socket
     */
    noiseState: NoiseState;

    /**
     * Remote public key when connecting to a remote server. When provided,
     * makes the socket the noise state initiator.
     */
    rpk?: Buffer;

    /**
     * Logger that can be optionally used by the noise system
     */
    logger?: ILogger;

    /**
     * High watermark for the stream
     */
    highWaterMark?: number;
};
