import { StreamReader } from "@node-dlc/bufio";
import { ICloneable } from "./ICloneable";
import { TimeLockMode } from "./TimeLockMode";

const MAX_SEQUENCE = 0xffff_ffff;
const DEFAULT_SEQUENCE = 0xffff_ffff;

/**
 * A transaction input's nSequence field according to BIP 68 where
 * rules for relative timelocks are defined. Relative timelocks prevent
 * mining of a transaction until a certain age of the spent output
 * in blocks or timespan.
 *
 * nSequence defaults to a value of 0xffff_ffff which disables the field.
 * When using a nLocktime, at least one transaction must be non-default.
 * In this condition, it is standard to use 0xffff_fffe.
 */
export class Sequence implements ICloneable<Sequence> {
    /**
     * Parses the value from a byte stream
     * @param reader
     */
    public static parse(reader: StreamReader): Sequence {
        return new Sequence(reader.readUInt32LE());
    }

    /**
     * Creates an nSequence value of 0xffff_fffe which is used to enable
     * nLockTime.
     */
    public static locktime(): Sequence {
        return new Sequence(0xffff_fffe);
    }

    /**
     * Creates an nSequence value of 0xffff_fffd which is used to
     * enable opt-in full replace-by-fee.
     */
    public static rbf(): Sequence {
        return new Sequence(0xffff_fffd);
    }

    /**
     * Creates an nSequence value of 0xffff_ffff
     */
    public static default(): Sequence {
        return new Sequence();
    }

    /**
     * Creates an nSequence value of 0
     */
    public static zero(): Sequence {
        return new Sequence(0);
    }

    /**
     * Creates an nSequence value with the specified block delay
     * @param blocks number of blocks sequence must wait
     */
    public static blockDelay(blocks: number): Sequence {
        const sut = new Sequence();
        sut.blockDelay = blocks;
        return sut;
    }

    /**
     * Creates an nSequence value with the specified time delay
     * @param seconds delay in seconds which will be rounded up to the
     * nearest 512 second interval
     */
    public static timeDelay(seconds: number): Sequence {
        const sut = new Sequence();
        sut.timeDelay = seconds;
        return sut;
    }

    /**
     * Gets or sets the raw nSequence value.
     */
    public get value(): number {
        return this._value;
    }

    public set value(val: number) {
        if (val < 0 || val > MAX_SEQUENCE) throw new Error("Invalid nSequence");
        this._value = val;
    }

    private _value: number;

    constructor(val: number = DEFAULT_SEQUENCE) {
        this.value = val;
    }

    /**
     * Returns true when the nSequence is the default value 0xffff_ffff
     */
    public get isDefault() {
        return this.value === DEFAULT_SEQUENCE;
    }

    /**
     * Returns true when the relative timelock is enabled. Technically
     * this occurs when the top-most bit is unset. This means that the
     * default value of 0xffff_ffff is unset.
     */
    public get enabled(): boolean {
        return BigInt(this.value) >> 31n === 0n;
    }

    /**
     * Returns true for a value that would enable nLockTime. To enable
     * nLockTime, at least one input in the transaction must have a
     * non-default nSequence value.
     */
    public get isLockTimeSignaled(): boolean {
        return this.value < DEFAULT_SEQUENCE;
    }

    /**
     * Returns true for a value that would signal opt-in replace-by-fee
     * as defined in BIP 125. To signal this, the nSequence must be less
     * than 0xffffffff-1.
     */
    public get isRBFSignaled(): boolean {
        return this.value < DEFAULT_SEQUENCE - 1;
    }

    /**
     * Gets the time lock mode for the nSequence. Technically, the bit
     * with index 22 controls the mode. When the bit is set, it will use
     * time-based relative time locks. When it is unset, it will use
     * block-based relatively time locks.
     */
    public get mode(): TimeLockMode {
        if (this.value >> 22 === 1) return TimeLockMode.Time;
        else return TimeLockMode.Block;
    }

    /**
     * Gets or sets a relative timelock in seconds. Time-based relative
     * time locks are encoded in 512 second granularity which is close
     * to the 600 seconds each block should be generated in. When
     * setting a value in seconds, it will rounded up to the nearest
     * 512s granularity.
     */
    public get timeDelay(): number {
        return (this.value & 0xffff) * 512;
    }

    public set timeDelay(seconds: number) {
        // calculate the delay in 512 second granularity
        let value = Math.ceil(seconds / 512);

        // if the value execeeds the max value, throw an error
        if (value < 0 || value > 0xffff) throw new Error("Invalid nSequence value");

        // set the typeto time-based relatively timelock
        value |= 1 << 22;

        // set the actual value
        this.value = value;
    }

    /**
     * Gets or set a relative timelock in blocks.
     */
    public get blockDelay(): number {
        return this.value & 0xffff;
    }

    public set blockDelay(blocks: number) {
        // if the value exceeds the max value, throw an error
        if (blocks < 0 || blocks > 0xffff) throw new Error("Invalid nSequence value");

        this.value = blocks;
    }

    /**
     * Serializes the value to a buffer
     */
    public serialize(): Buffer {
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(this.value, 0);
        return buf;
    }

    /**
     * Returns the raw value as a hex encoded string, eg: 0xfffffffe
     */
    public toString(): string {
        return "0x" + this.value.toString(16).padStart(8, "0");
    }

    /**
     * Returns the raw value as a hex encoded string, eg: 0xfffffffe
     */
    public toJSON(): string {
        return this.toString();
    }

    /**
     * Clone via deep copy
     */
    public clone(): Sequence {
        return new Sequence(this._value);
    }
}
