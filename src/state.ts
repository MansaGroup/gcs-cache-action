import core from '@actions/core';

export type CacheHitKindState = 'exact' | 'partial' | 'none';

export interface State {
  cacheHitKind: CacheHitKindState;
}

export function saveState(state: State): void {
  core.saveState('cache-hit-kind', state.cacheHitKind);
}

export function getState(): State {
  return {
    cacheHitKind: core.getState('cache-hit-kind') as CacheHitKindState,
  };
}
