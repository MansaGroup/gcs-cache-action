import * as core from '@actions/core';

export interface Inputs {
  bucket: string;
  path: string;
  key: string;
  restoreKeys: string[];
}

export function getInputs(): Inputs {
  const inputs = {
    bucket: core.getInput('bucket', { required: true }),
    path: core.getInput('path', { required: true }),
    key: core.getInput('key', { required: true }),
    restoreKeys: core
      .getInput('restore-keys')
      .split(/(,|\n)/)
      .map((key) => key.trim())
      .filter((path) => path),
  };

  core.debug(`Loaded inputs: ${JSON.stringify(inputs)}.`);

  return inputs;
}
