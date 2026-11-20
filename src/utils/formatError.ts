/**
 * Turns anything thrown into a one-line message and an optional detail line
 * for the terminal. The detail is the message of the error's `cause`, e.g.
 * the JSON syntax error behind "Failed to read runpad.config.json".
 */
const formatError = (error: unknown): { message: string; detail?: string } => {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const { cause } = error;
  const detail =
    cause instanceof Error
      ? cause.message
      : cause === undefined
        ? undefined
        : String(cause);

  return detail
    ? { message: error.message, detail }
    : { message: error.message };
};

export default formatError;
