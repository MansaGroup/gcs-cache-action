import * as core from '@actions/core';
import * as github from '@actions/github';
import { Storage, File, Bucket } from '@google-cloud/storage';
import { withFile as withTemporaryFile } from 'tmp-promise';

import { ObjectMetadata } from './gcs-utils';
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

  core.debug(`Exact file name: ${exactFile.name}.`);

  if (exactFileExists) {
    console.log(`🙌 Found exact match from cache for key '${key}'.`);
    return [exactFile, 'exact'];
  } else {
    console.log(`🔸 No exact match found for key '${key}'.`);
  }

  const bucketFiles = await bucket
    .getFiles({
      prefix: `${folderPrefix}/${restoreKeys[restoreKeys.length - 1]}`,
    })
    .then(([files]) =>
      files.sort(
        (a, b) =>
          new Date((b.metadata as ObjectMetadata).updated).getTime() -
          new Date((a.metadata as ObjectMetadata).updated).getTime(),
      ),
    );

  if (core.isDebug()) {
    core.debug(
      `Candidates: ${JSON.stringify(
        bucketFiles.map((f) => ({
          name: f.name,
          metadata: {
            updated: (f.metadata as ObjectMetadata).updated,
          },
        })),
      )}.`,
    );
  }

  for (const restoreKey of restoreKeys) {
    const foundFile = bucketFiles.find((file) =>
      file.name.startsWith(`${folderPrefix}/${restoreKey}`),
    );

    if (foundFile) {
      console.log(`🤝 Found match from cache for restore key '${restoreKey}'.`);
      return [foundFile, 'partial'];
    } else {
      console.log(
        `🔸 No cache candidate found for restore key '${restoreKey}'.`,
      );
    }
  }

  return [null, 'none'];
}

async function main() {
  const inputs = getInputs();
  const bucket = new Storage().bucket(inputs.bucket);

  const folderPrefix = `${github.context.repo.owner}/${github.context.repo.repo}`;
  const exactFileName = `${folderPrefix}/${inputs.key}.tar`;

  const [bestMatch, bestMatchKind] = await core
    .group('🔍 Searching the best cache archive available', () =>
      getBestMatch(bucket, inputs.key, inputs.restoreKeys),
    )
    .catch((err) => {
      core.setFailed(err);
      throw err;
    });

  core.debug(`Best match kind: ${bestMatchKind}.`);

  if (!bestMatch) {
    saveState({
      cacheHitKind: 'none',
      targetFileName: exactFileName,
    });
    core.setOutput('cache-hit', 'false');
    console.log('😢 No cache candidate found.');
    return;
  }

  core.debug(`Best match name: ${bestMatch.name}.`);

  const bestMatchMetadata = await bestMatch
    .getMetadata()
    .then(([metadata]) => metadata as ObjectMetadata);

  core.debug(`Best match metadata: ${JSON.stringify(bestMatchMetadata)}.`);

  const compressionMethod =
    bestMatchMetadata?.metadata?.['Cache-Action-Compression-Method'];

  core.debug(`Best match compression method: ${compressionMethod}.`);

  if (!bestMatchMetadata || !compressionMethod) {
    saveState({
      cacheHitKind: 'none',
      targetFileName: exactFileName,
    });

    core.setOutput('cache-hit', 'false');
    console.log('😢 No cache candidate found (missing metadata).');
    return;
  }

  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();

  return withTemporaryFile(async (tmpFile) => {
    await core.group('🌐 Downloading cache archive from bucket', async () => {
      console.log(`🔹 Downloading file '${bestMatch.name}'...`);

      return bestMatch.download({
        destination: tmpFile.path,
      });
    });

    await core.group('🗜️ Extracting cache archive', () =>
      extractTar(tmpFile.path, compressionMethod, workspace),
    );

    saveState({
      cacheHitKind: bestMatchKind,
      targetFileName: exactFileName,
    });
    core.setOutput('cache-hit', 'true');
    console.log('✅ Successfully restored cache.');
  });
}

void main();
