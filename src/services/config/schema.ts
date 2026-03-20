import {
  Array as TypeArray,
  Literal,
  Object as TypeObject,
  Optional,
  Record as TypeRecord,
  Static,
  String as TypeString,
  Union,
} from 'typebox';

const OnCreateSchema = Union([TypeString(), TypeArray(TypeString())]);

const WorktreeSettingsSchema = TypeObject(
  {
    worktreeRoot: Optional(TypeString()),
    parentDir: Optional(TypeString()),
    onCreate: Optional(OnCreateSchema),
  },
  {
    $id: 'WorktreeSettingsConfig',
    additionalProperties: false,
  }
);

const MatchingStrategySchema = Union([
  Literal('fail-on-tie'),
  Literal('first-wins'),
  Literal('last-wins'),
]);

// TODO: join this with MatchingStrategySchema
const MatchStrategyResultSchema = Union([Literal('exact'), Literal('unmatched')]);

const WorktreesMapSchema = TypeRecord(TypeString(), WorktreeSettingsSchema);
const LogfileSchema = TypeString();

export const PiWorktreeConfigSchema = TypeObject(
  {
    worktrees: Optional(WorktreesMapSchema),
    matchingStrategy: Optional(MatchingStrategySchema),
    logfile: Optional(LogfileSchema),
  },
  {
    $id: 'UnresolvedConfig',
    additionalProperties: true,
  }
);

export type WorktreeSettingsConfig = Static<typeof WorktreeSettingsSchema>;
export type MatchingStrategy = Static<typeof MatchingStrategySchema>;
export type MatchingStrategyResult = Static<typeof MatchStrategyResultSchema>;
export type PiWorktreeConfig = Static<typeof PiWorktreeConfigSchema>;
export type PiWorktreeRecord = NonNullable<PiWorktreeConfig['worktrees']>;
export type PiWorktreeLogTemplate = NonNullable<PiWorktreeConfig['logfile']>;

export function getConfiguredWorktreeRoot(settings: WorktreeSettingsConfig): string | undefined {
  return settings.worktreeRoot ?? settings.parentDir;
}
