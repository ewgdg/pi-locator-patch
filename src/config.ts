import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface LocatorPatchConfig {
  profile: LocatorPatchProfile;
}

export type LocatorPatchProfile = "classic" | "smart" | "hash";

const ENV_PROFILE = "PI_LOCATOR_PATCH_PROFILE";
const EXTENSION_CONFIG_PATH = [
  "extensions",
  "pi-locator-patch",
  "config.json",
] as const;

export async function readLocatorPatchConfig(): Promise<LocatorPatchConfig> {
  const globalConfig = await readConfigJson(globalConfigPath());
  const explicitProfile = readEnvProfile() ?? readProfile(globalConfig);
  const profile = explicitProfile ?? "classic";
  return { profile };
}

function globalConfigPath(): string {
  return join(
    process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
    ...EXTENSION_CONFIG_PATH,
  );
}

async function readConfigJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return {};
  }
}

function readProfile(config: unknown): LocatorPatchProfile | undefined {
  if (!isObject(config)) return undefined;
  return parseProfile(config.profile);
}

function readEnvProfile(): LocatorPatchProfile | undefined {
  return parseProfile(process.env[ENV_PROFILE]);
}

function parseProfile(value: unknown): LocatorPatchProfile | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "classic" ||
    normalized === "smart" ||
    normalized === "hash"
  )
    return normalized;
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
