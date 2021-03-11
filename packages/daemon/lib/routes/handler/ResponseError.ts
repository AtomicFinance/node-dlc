interface ResponseError extends Error {
  status?: number;
}

export function responseError(status, msg) {
  var err = new Error(msg) as ResponseError;
  err.status = status;
  return err;
}
