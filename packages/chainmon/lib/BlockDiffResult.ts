import { BlockHeader } from "@node-dlc/bitcoind";

export class BlockDiffResult {
    constructor(
        readonly commonAncestor: BlockHeader,
        readonly disconnects: BlockHeader[],
        readonly connects: BlockHeader[],
    ) {}
}
