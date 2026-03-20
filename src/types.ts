import type { ExtensionCommandContext } from '@mariozechner/pi-coding-agent';
import type { PiWorktreeConfigService } from './services/config/config.ts';
import { WorktreeSettingsConfig } from './services/config/schema.ts';

export interface WorktreeCreatedContext {
  path: string;
  name: string;
  branch: string;
  project: string;
  mainWorktree: string;
}

export interface CommandDeps {
  settings: WorktreeSettingsConfig;
  configService: PiWorktreeConfigService;
}

// eslint-disable-next-line no-unused-vars
export type CmdHandler = (...args: [string, ExtensionCommandContext, CommandDeps]) => Promise<void>;
