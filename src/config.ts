import { homedir } from 'os';
import path from 'path';
import { createConfigService } from 'pi-extension-config';
import { Object as TypeObject, Optional, Static, String as TypeString } from 'typebox';
import { Parse } from 'typebox/value';

const APP_NAME = 'pi-worktrees';

export const SETTINGS_FILE_PATH = path.join(homedir(), '.pi', 'agent', `${APP_NAME}.config.json`);

const WorktreeSettingsSchema = TypeObject(
  {
    parentDir: Optional(TypeString()),
    onCreate: Optional(TypeString()),
  },
  {
    $id: 'WorktreeSettingsConfig',
    additionalProperties: false,
  }
);

export type WorktreeSettingsConfig = Static<typeof WorktreeSettingsSchema>;

const UnresolvedConfigSchema = TypeObject(
  {
    worktree: Optional(WorktreeSettingsSchema),
    // legacy flat shape support
    parentDir: Optional(TypeString()),
    onCreate: Optional(TypeString()),
  },
  {
    $id: 'UnresolvedConfig',
    additionalProperties: true,
  }
);

type UnresolvedConfig = Static<typeof UnresolvedConfigSchema>;

const ResolvedConfigSchema = TypeObject(
  {
    worktree: WorktreeSettingsSchema,
  },
  {
    $id: 'ResolvedConfig',
    additionalProperties: false,
  }
);

export type ResolvedConfig = Static<typeof ResolvedConfigSchema>;

function buildWorktreeSettings(config: UnresolvedConfig): WorktreeSettingsConfig {
  const nested = config.worktree || {};
  const parentDir = nested.parentDir ?? config.parentDir;
  const onCreate = nested.onCreate ?? config.onCreate;

  const next: WorktreeSettingsConfig = {};

  if (parentDir !== undefined) {
    next.parentDir = parentDir;
  }

  if (onCreate !== undefined) {
    next.onCreate = onCreate;
  }

  return next;
}

export function normalizeConfig(value: unknown): ResolvedConfig {
  const parsed = Parse(UnresolvedConfigSchema, value);

  return Parse(ResolvedConfigSchema, {
    worktree: buildWorktreeSettings(parsed),
  });
}

const configService = await createConfigService<ResolvedConfig>(APP_NAME, {
  defaults: {
    worktree: {},
  },
  parse: normalizeConfig,
});

export let Config: ResolvedConfig = configService.config;

export function getWorktreeSettings(): WorktreeSettingsConfig {
  return Config.worktree;
}

export async function saveWorktreeSettings(
  worktreeSettings: WorktreeSettingsConfig
): Promise<ResolvedConfig> {
  const normalized = normalizeConfig({
    worktree: worktreeSettings,
  });

  await configService.set('worktree', normalized.worktree, 'home');
  await configService.save('home');

  Config = configService.config;

  return Config;
}

/*
 * Reload values from env + config file and return the normalized config snapshot.
 */
export async function reloadConfig(): Promise<ResolvedConfig> {
  await configService.reload();
  Config = configService.config;
  return Config;
}
