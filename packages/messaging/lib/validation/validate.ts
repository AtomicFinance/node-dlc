export const validateBuffer = (
  value: Buffer,
  key: string,
  className: string,
  expectedLength?: number,
): void => {
  if (value === undefined) throw Error(`${className} ${key} is undefined`);
  if (value.length === 0) throw Error(`${className} ${key} length cannot be 0`);
  if (expectedLength && value.length !== expectedLength)
    throw Error(`${className} ${key} length expected to be ${expectedLength}`);
};

export const validateBigInt = (
  value: bigint,
  key: string,
  className: string,
): void => {
  if (value === undefined) throw Error(`${className} ${key} is undefined`);
  if (typeof value !== 'bigint')
    throw Error(`${className} ${key} must be type bigint`);
  if (value === BigInt(0))
    throw Error(`${className} ${key} must be greater than 0`);
};

export const validateNumber = (
  value: number,
  key: string,
  className: string,
): void => {
  if (value === undefined) throw Error(`${className} ${key} is undefined`);
  if (typeof value !== 'number')
    throw Error(`${className} ${key} must be type number`);
  if (value === 0) throw Error(`${className} ${key} must be greater than 0`);
};
