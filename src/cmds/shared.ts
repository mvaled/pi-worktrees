import { spawn } from 'child_process';
import { expandTemplate } from '../services/templates.ts';
import type { WorktreeSettingsConfig } from '../services/config.ts';
import type { WorktreeCreatedContext } from '../types.ts';

/**
 * Runs the optional post-create hook after a worktree is successfully created.
 *
 * Why: this enables per-project bootstrapping (e.g. dependency/setup commands)
 * while keeping failures non-fatal so worktree creation itself always succeeds.
 */
export async function runOnCreateHook(
  createdCtx: WorktreeCreatedContext,
  settings: WorktreeSettingsConfig,
  notify: (msg: string, type: 'info' | 'error' | 'warning') => void
): Promise<void> {
  if (!settings.onCreate) {
    return;
  }

  const command = expandTemplate(settings.onCreate, createdCtx);
  notify(`Running: ${command}`, 'info');

  await new Promise<void>((resolve) => {
    const child = spawn(command, {
      cwd: createdCtx.path,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        if (stdout.trim()) {
          notify(stdout.trim().slice(0, 200), 'info');
        }
        resolve();
        return;
      }

      notify(`onCreate failed (exit ${code}): ${stderr.slice(0, 200)}`, 'error');
      resolve();
    });

    child.on('error', (err) => {
      notify(`onCreate error: ${err.message}`, 'error');
      resolve();
    });
  });
}
