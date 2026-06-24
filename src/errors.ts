export class HashlinePatchError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(`${code} ${message}`);
    this.name = new.target.name;
  }
}

export class InvalidPatchError extends HashlinePatchError {
  constructor(message: string) {
    super("[E_INVALID_PATCH]", message);
  }
}

export class StaleHunkError extends HashlinePatchError {
  constructor(message: string) {
    super("[E_STALE_HUNK]", message);
  }
}

export class AmbiguousHunkError extends HashlinePatchError {
  constructor(message: string) {
    super("[E_AMBIGUOUS_HUNK]", message);
  }
}

export class UnsupportedHunkError extends HashlinePatchError {
  constructor(message: string) {
    super("[E_UNSUPPORTED_HUNK]", message);
  }
}

export class FileTextError extends HashlinePatchError {
  constructor(message: string) {
    super("[E_FILE_TEXT]", message);
  }
}

export class OutputTooLargeError extends HashlinePatchError {
  constructor(message: string) {
    super("[E_OUTPUT_TOO_LARGE]", message);
  }
}
