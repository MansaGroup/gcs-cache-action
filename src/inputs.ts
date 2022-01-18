import core from '@actions/core';

export interface Inputs {
  bucket: string;
  path: string;
  key: string;
  restoreKeys: string[];
}

export function getInputs(): Inputs {
  return {
    bucket: core.getInput('targets', { required: true }),
    path: core.getInput('path', { required: true }),
    key: core.getInput('key', { required: true }),
    restoreKeys: core
      .getInput('restore-keys')
      .split(',')
      .filter((path) => path),
  };
}
