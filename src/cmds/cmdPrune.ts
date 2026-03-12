import type { ExtensionCommandContext } from '@mariozechner/pi-coding-agent';
import { git, isGitRepo } from '../services/git.ts';

export async function cmdPrune(_args: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!isGitRepo(ctx.cwd)) {
    ctx.ui.notify('Not in a git repository', 'error');
    return;
  }

  let dryRun: string;
  try {
    dryRun = git(['worktree', 'prune', '--dry-run'], ctx.cwd);
  } catch (err) {
    ctx.ui.notify(`Failed to check stale worktrees: ${(err as Error).message}`, 'error');
    return;
  }

  if (!dryRun.trim()) {
    ctx.ui.notify('No stale worktree references to prune', 'info');
    return;
  }

  const confirmed = await ctx.ui.confirm(
    'Prune stale worktrees?',
    `The following stale references will be removed:\n\n${dryRun}`
  );

  if (!confirmed) {
    ctx.ui.notify('Cancelled', 'info');
    return;
  }

  try {
    git(['worktree', 'prune'], ctx.cwd);
    ctx.ui.notify('✓ Stale worktree references pruned', 'info');
  } catch (err) {
    ctx.ui.notify(`Failed to prune: ${(err as Error).message}`, 'error');
  }
}
