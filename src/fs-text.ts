import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, chmod, lstat, readFile, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { TextDecoder } from "node:util";
import { FileTextError } from "./errors.js";

export interface ReadTextFileResult {
  path: string;
  text: string;
}

export interface ReadTextFileOptions {
  writable?: boolean;
}

export function resolveToolPath(cwd: string, inputPath: string): string {
  return resolve(cwd, inputPath.replace(/^@/, ""));
}

export async function resolveExistingRealPath(cwd: string, inputPath: string): Promise<string> {
  const absolutePath = resolveToolPath(cwd, inputPath);
  try {
    return await realpath(absolutePath);
  } catch (error) {
    throw new FileTextError(`File not found: ${inputPath}`);
  }
}

export async function readExistingTextFile(path: string, options: ReadTextFileOptions = {}): Promise<ReadTextFileResult> {
  const realTargetPath = await realpath(path).catch(() => {
    throw new FileTextError(`File not found: ${path}`);
  });

  const stats = await stat(realTargetPath);
  if (!stats.isFile()) {
    throw new FileTextError(`Path is not a regular text file: ${path}`);
  }

  const mode = options.writable ? constants.R_OK | constants.W_OK : constants.R_OK;
  await access(realTargetPath, mode).catch(() => {
    throw new FileTextError(options.writable ? `File is not readable and writable: ${path}` : `File is not readable: ${path}`);
  });

  const buffer = await readFile(realTargetPath);
  if (buffer.includes(0)) {
    throw new FileTextError(`Binary file rejected because it contains NUL bytes: ${path}`);
  }

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    return { path: realTargetPath, text: decoder.decode(buffer) };
  } catch (error) {
    throw new FileTextError(`Invalid UTF-8 text file: ${path}`);
  }
}

export async function writeTextFileAtomically(path: string, text: string): Promise<void> {
  const realTargetPath = await realpath(path).catch(() => {
    throw new FileTextError(`File not found: ${path}`);
  });
  const existingStats = await stat(realTargetPath);
  if (!existingStats.isFile()) {
    throw new FileTextError(`Path is not a regular text file: ${path}`);
  }

  // Always write the resolved target so editing a symlink updates its target, not the symlink inode.
  const targetDirectory = dirname(realTargetPath);
  const tempPath = resolve(targetDirectory, `.hashline-patch-${process.pid}-${randomUUID()}.tmp`);

  try {
    await writeFile(tempPath, text, { encoding: "utf8", flag: "wx", mode: existingStats.mode & 0o777 });
    await chmod(tempPath, existingStats.mode & 0o777);
    await rename(tempPath, realTargetPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

export async function assertNotDirectory(path: string): Promise<void> {
  const stats = await lstat(path).catch(() => undefined);
  if (stats?.isDirectory()) {
    throw new FileTextError(`Directories are not supported: ${path}`);
  }
}
