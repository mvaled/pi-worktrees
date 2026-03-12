import type { ExtensionCommandContext } from '@mariozechner/pi-coding-agent';
import type { WorktreeConfigService, WorktreeSettingsConfig } from './services/config.ts';

export interface WorktreeCreatedContext {
  path: string;
  name: string;
  branch: string;
  project: string;
  mainWorktree: string;
}

export interface CommandDeps {
  settings: WorktreeSettingsConfig;
  configService: WorktreeConfigService;
}

export type CmdHandler = (
  args: string,
  ctx: ExtensionCommandContext,
  deps: CommandDeps
) => Promise<void>;
