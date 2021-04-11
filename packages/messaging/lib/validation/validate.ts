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
