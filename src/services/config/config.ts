import { createConfigService } from '@zenobius/pi-extension-config';
import { Parse } from 'typebox/value';

import { migration as migration_01 } from './migrations/01-flat-single.ts';
import {
  getMainWorktreePath,
  getProjectName,
  getRemoteUrl,
  getWorktreeParentDir,
  matchRepo,
} from '../git.ts';
import { PiWorktreeConfig, PiWorktreeConfigSchema, WorktreeSettingsConfig } from './schema.ts';

export async function createPiWorktreeConfigService() {
  const parse = (value: unknown) => {
    return Parse(PiWorktreeConfigSchema, value);
  };

  const store = await createConfigService('pi-worktrees', {
    defaults: {},
    parse,
    migrations: [migration_01],
  });

  await store.reload();

  const save = async (data: PiWorktreeConfig) => {
    if (data.worktrees !== undefined) {
      await store.set('worktrees', data.worktrees, 'home');
    }

    if (data.matchingStrategy !== undefined) {
      await store.set('matchingStrategy', data.matchingStrategy, 'home');
    }

    await store.save('home');
  };

  const worktrees = new Map(Object.entries(store.config.worktrees || {}));

  const current = (ctx: { cwd: string }) => {
    const repo = getRemoteUrl(ctx.cwd);
    const settings = matchRepo(repo, worktrees, store.config.matchingStrategy);
    const project = getProjectName(ctx.cwd);
    const mainWorktree = getMainWorktreePath(ctx.cwd);
    const parentDir = getWorktreeParentDir(ctx.cwd, worktrees, store.config.matchingStrategy);

    return {
      repo,
      settings,
      project,
      mainWorktree,
      parentDir,
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
  parentDir: '{repoName}.worktrees',
  onCreate: 'cd {cwd}',
};

export type PiWorktreeConfigService = Awaited<ReturnType<typeof createPiWorktreeConfigService>>;
export type PiWorktreeConfiguredWorktreeMap = PiWorktreeConfigService['worktrees'];
