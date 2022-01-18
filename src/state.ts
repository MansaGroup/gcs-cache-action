import * as core from '@actions/core';

export type CacheHitKindState = 'exact' | 'partial' | 'none';

export interface State {
  cacheHitKind: CacheHitKindState;
  targetFileName: string;
}

export function saveState(state: State): void {
  core.debug(`Saving state: ${JSON.stringify(state)}.`);

  core.saveState('cache-hit-kind', state.cacheHitKind);
  core.saveState('target-file-name', state.targetFileName);
}

export function getState(): State {
  const state = {
    cacheHitKind: core.getState('cache-hit-kind') as CacheHitKindState,
    targetFileName: core.getState('target-file-name'),
  };

  core.debug(`Loaded state: ${JSON.stringify(state)}.`);

  return state;
}
