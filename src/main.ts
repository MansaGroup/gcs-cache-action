import * as core from '@actions/core';
import * as github from '@actions/github';
import { Storage, File, Bucket } from '@google-cloud/storage';
import { withFile as withTemporaryFile } from 'tmp-promise';

import { CacheActionMetadata } from './gcs-utils';
import { getInputs } from './inputs';
import { CacheHitKindState, saveState } from './state';
import { extractTar } from './tar-utils';

async function getBestMatch(
  bucket: Bucket,
  key: string,
  restoreKeys: string[],
): Promise<[File, Exclude<CacheHitKindState, 'none'>] | [null, 'none']> {
  const folderPrefix = `${github.context.repo.owner}/${github.context.repo.repo}`;

  const exactFile = bucket.file(`${folderPrefix}/${key}.tar`);
  const [exactFileExists] = await exactFile.exists();

  if (exactFileExists) {
    console.log(`🙌 Found exact match from cache: ${key}.`);
    return [exactFile, 'exact'];
  }

  const [bucketFiles] = await bucket.getFiles({
    prefix: `${folderPrefix}/${restoreKeys[restoreKeys.length - 1]}`,
  });

  for (const restoreKey of restoreKeys) {
    const foundFile = bucketFiles.find((file) =>
      file.name.startsWith(`${folderPrefix}/${restoreKey}`),
    );

    if (foundFile) {
      console.log(`🤝 Found restore key match from cache: ${restoreKey}.`);
      return [foundFile, 'partial'];
    } else {
      console.log(
        `🔸 No cache candidate found for restore key: ${restoreKey}.`,
      );
    }
  }

  return [null, 'none'];
}

async function main() {
  const inputs = getInputs();
  const bucket = new Storage().bucket(inputs.bucket);

  const [bestMatch, bestMatchKind] = await core
    .group('🔍 Searching the best cache archive available', () =>
      getBestMatch(bucket, inputs.key, inputs.restoreKeys),
    )
    .catch((err) => {
      core.setFailed(err);
      throw err;
    });

  if (!bestMatch) {
    saveState({
      cacheHitKind: 'none',
    });
    core.setOutput('cache-hit', 'false');
    console.log('😢 No cache candidate found.');
    return;
  }

  const bestMatchMetadata = await bestMatch
    .getMetadata()
    .then(([metadata]) => metadata as CacheActionMetadata);

  const compressionMethod =
    bestMatchMetadata?.metadata?.['Cache-Action-Compression-Method'];

  if (!bestMatchMetadata || !compressionMethod) {
    saveState({
      cacheHitKind: 'none',
    });
    core.setOutput('cache-hit', 'false');
    console.log('😢 No cache candidate found (missing metadata).');
    return;
  }

  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

  return withTemporaryFile(async (tmpFile) => {
    console.log('🌐 Downloading cache archive from bucket...');
    await bestMatch.download({
      destination: tmpFile.path,
    });

    await core.group('🗜️ Extracting cache archive...', () =>
      extractTar(tmpFile.path, compressionMethod, workspace),
    );

    saveState({
      cacheHitKind: bestMatchKind,
    });
    core.setOutput('cache-hit', 'true');
    console.log('✅ Successfully restored cache.');
  });
}

void main();
