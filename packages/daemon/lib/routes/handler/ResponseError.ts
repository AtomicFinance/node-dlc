interface IResponseError extends Error {
  status?: number;
}

export function responseError(status, msg) {
  const err = new Error(msg) as IResponseError;
  err.status = status;
  return err;
}
