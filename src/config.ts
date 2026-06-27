import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface LocatorPatchConfig {
  hashMode: boolean;
}

const ENV_HASH_MODE = "PI_LOCATOR_PATCH_HASH_MODE";

export async function readLocatorPatchConfig(cwd: string, projectTrusted = true): Promise<LocatorPatchConfig> {
  const globalSettings = await readSettingsJson(globalSettingsPath());
  const projectSettings = projectTrusted ? await readSettingsJson(join(cwd, ".pi", "settings.json")) : {};
  const settingsHashMode = readHashMode(projectSettings) ?? readHashMode(globalSettings) ?? false;
  return { hashMode: readEnvHashMode() ?? settingsHashMode };
}

function globalSettingsPath(): string {
  return join(process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"), "settings.json");
}

async function readSettingsJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return {};
  }
}

function readHashMode(settings: unknown): boolean | undefined {
  if (!isObject(settings)) return undefined;
  const locatorPatch = settings.locatorPatch;
  if (!isObject(locatorPatch)) return undefined;
  return typeof locatorPatch.hashMode === "boolean" ? locatorPatch.hashMode : undefined;
}

function readEnvHashMode(): boolean | undefined {
  const value = process.env[ENV_HASH_MODE]?.trim().toLowerCase();
  if (!value) return undefined;
  if (["1", "true", "yes", "on", "hash"].includes(value)) return true;
  if (["0", "false", "no", "off", "plain"].includes(value)) return false;
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}