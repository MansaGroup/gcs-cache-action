/* eslint-disable sonarjs/no-duplicate-string */

import * as exec from '@actions/exec';
import * as semver from 'semver';

enum CompressionMethod {
  GZIP,
  ZSTD_WITHOUT_LONG,
  ZSTD,
}

async function getTarCompressionMethod(): Promise<CompressionMethod> {
  if (process.platform === 'win32') {
    return CompressionMethod.GZIP;
  }

  const [zstdOutput, zstdVersion] = await exec
    .getExecOutput('zstd', ['--version'], {
      ignoreReturnCode: true,
      silent: true,
    })
    .then((out) => out.stdout.trim())
    .then((out) => [out, semver.clean(out)]);

  if (!zstdOutput?.toLowerCase().includes('zstd command line interface')) {
    return CompressionMethod.GZIP;
  } else if (!zstdVersion || semver.lt(zstdVersion, 'v1.3.2')) {
    return CompressionMethod.ZSTD_WITHOUT_LONG;
  } else {
    return CompressionMethod.ZSTD;
  }
}

export async function createTar(
  archivePath: string,
  paths: string[],
  cwd: string,
): Promise<number> {
  const compressionMethod = await getTarCompressionMethod();

  const compressionArgs =
    compressionMethod === CompressionMethod.GZIP
      ? ['-z']
      : compressionMethod === CompressionMethod.ZSTD_WITHOUT_LONG
      ? ['--use-compress-program', 'zstd -T0 --long=30']
      : ['--use-compress-program', 'zstd -T0'];

  return exec.exec('tar', [
    '-c',
    ...compressionArgs,
    '--posix',
    '-f',
    archivePath,
    '-C',
    cwd,
    ...paths,
  ]);
}

export async function extractTar(
  archivePath: string,
  cwd: string,
): Promise<number> {
  const compressionMethod = await getTarCompressionMethod();

  const compressionArgs =
    compressionMethod === CompressionMethod.GZIP
      ? ['-z']
      : compressionMethod === CompressionMethod.ZSTD_WITHOUT_LONG
      ? ['--use-compress-program', 'zstd -d --long=30']
      : ['--use-compress-program', 'zstd -d'];

  return exec.exec('tar', [
    '-x',
    ...compressionArgs,
    '-f',
    archivePath,
    '-C',
    cwd,
  ]);
}
