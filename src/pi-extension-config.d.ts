/* eslint-disable no-unused-vars */
declare module 'pi-extension-config' {
  export type ConfigParseFn<TConfig> = (config: unknown) => TConfig | Promise<TConfig>;

  export interface CreateConfigServiceOptions<TConfig> {
    defaults?: Partial<TConfig>;
    parse?: ConfigParseFn<TConfig>;
  }

  export interface ConfigService<TConfig> {
    readonly config: TConfig;
    set(key: string, value: unknown, target?: 'home' | 'project'): Promise<void>;
    reload(): Promise<void>;
    save(target?: 'home' | 'project'): Promise<void>;
  }

  export function createConfigService<TConfig = Record<string, unknown>>(
    name: string,
    options?: CreateConfigServiceOptions<TConfig>
  ): Promise<ConfigService<TConfig>>;
}
