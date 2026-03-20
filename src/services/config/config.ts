import { createConfigService } from '@zenobius/pi-extension-config';
import { Parse } from 'typebox/value';

import { migration as migration_01 } from './migrations/01-flat-single.ts';
import { migration as migration_02 } from './migrations/02-worktree-to-worktrees.ts';
import { migration as migration_03 } from './migrations/03-parentDir-to-worktreeRoot.ts';
import {
  getMainWorktreePath,
  getProjectName,
  getRemoteUrl,
  getWorktreeParentDir,
  matchRepo,
} from '../git.ts';
import { PiWorktreeConfig, PiWorktreeConfigSchema, WorktreeSettingsConfig } from './schema.ts';

const DEFAULT_LOGFILE_TEMPLATE = '/tmp/pi-worktree-{sessionId}-{name}.log';

export async function createPiWorktreeConfigService() {
  const parse = (value: unknown) => {
    return Parse(PiWorktreeConfigSchema, value);
  };

  const store = await createConfigService('pi-worktrees', {
    defaults: {},
    parse,
    migrations: [migration_01, migration_02, migration_03],
  });

  await store.reload();

  const save = async (data: PiWorktreeConfig) => {
    if (data.worktrees !== undefined) {
      await store.set('worktrees', data.worktrees, 'home');
    }

    if (data.matchingStrategy !== undefined) {
      await store.set('matchingStrategy', data.matchingStrategy, 'home');
    }

    if (data.logfile !== undefined) {
      await store.set('logfile', data.logfile, 'home');
    }

    await store.save('home');
  };

  const worktrees = new Map(Object.entries(store.config.worktrees || {}));

  const current = (ctx: { cwd: string }) => {
    const repo = getRemoteUrl(ctx.cwd);
    const resolution = matchRepo(repo, worktrees, store.config.matchingStrategy);

    if (resolution.type === 'tie-conflict') {
      throw new Error(resolution.message);
    }

    const settings = resolution.settings;
    const project = getProjectName(ctx.cwd);
    const mainWorktree = getMainWorktreePath(ctx.cwd);
    const parentDir = getWorktreeParentDir(ctx.cwd, worktrees, store.config.matchingStrategy);

    return {
      ...settings,
      repo,
      project,
      mainWorktree,
      parentDir,
      logfile: store.config.logfile ?? DEFAULT_LOGFILE_TEMPLATE,
      matchedPattern: resolution.matchedPattern,
    };
  };

  const service = {
    ...store,
    worktrees,
    current,
    save,
  };

  return service;
}

export const DefaultWorktreeSettings: WorktreeSettingsConfig = {
  worktreeRoot: '{{mainWorktree}}.worktrees',
  onCreate: 'cd {cwd}',
};

export const DefaultLogfileTemplate = DEFAULT_LOGFILE_TEMPLATE;
export type PiWorktreeConfigService = Awaited<ReturnType<typeof createPiWorktreeConfigService>>;
export type PiWorktreeConfiguredWorktreeMap = PiWorktreeConfigService['worktrees'];
