import { homedir } from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { normalizeConfig, SETTINGS_FILE_PATH } from './config.ts';

describe('config', () => {
  it('uses the pi-extension-config home config path', () => {
    expect(SETTINGS_FILE_PATH).toBe(
      path.join(homedir(), '.pi', 'agent', 'pi-worktrees.config.json')
    );
  });

  it('normalizes legacy flat config into worktree namespace', () => {
    const normalized = normalizeConfig({
      parentDir: '~/.worktrees/{{project}}',
      onCreate: 'mise setup',
    });

    expect(normalized).toEqual({
      worktree: {
        parentDir: '~/.worktrees/{{project}}',
        onCreate: 'mise setup',
      },
    });
  });
});
