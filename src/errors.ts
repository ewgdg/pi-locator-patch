export interface PatchErrorLocation {
  inputLine?: number;
}

export class HashlinePatchError extends Error {
  public location?: PatchErrorLocation;

  constructor(
    public readonly code: string,
    public readonly detail: string,
    location?: PatchErrorLocation
  ) {
    super(`${code} ${formatPatchErrorDetail(detail, location)}`);
    this.name = new.target.name;
    this.location = location;
  }

  withLocation(location: PatchErrorLocation): this {
    if (this.location?.inputLine !== undefined || location.inputLine === undefined) {
      return this;
    }
    this.location = { ...this.location, ...location };
    this.message = `${this.code} ${formatPatchErrorDetail(this.detail, this.location)}`;
    return this;
  }
}

export function annotatePatchErrorLocation(error: unknown, location: PatchErrorLocation): unknown {
  if (error instanceof HashlinePatchError) {
    return error.withLocation(location);
  }
  return error;
}

function formatPatchErrorDetail(detail: string, location: PatchErrorLocation | undefined): string {
  return location?.inputLine === undefined ? detail : `Line ${location.inputLine}: ${detail}`;
}

export class InvalidPatchError extends HashlinePatchError {
  constructor(message: string, location?: PatchErrorLocation) {
    super("[E_INVALID_PATCH]", message, location);
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

export class PartialPatchError extends HashlinePatchError {
  constructor(message: string) {
    super("[E_PARTIAL_PATCH]", message);
  }
}

export class OutputTooLargeError extends HashlinePatchError {
  constructor(message: string) {
    super("[E_OUTPUT_TOO_LARGE]", message);
  }
}
