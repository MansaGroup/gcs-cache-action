import { CompressionMethod } from './tar-utils';

export interface ObjectMetadata {
  updated: string;
  metadata: CacheActionMetadata;
}

export interface CacheActionMetadata {
  'Cache-Action-Compression-Method': CompressionMethod;
}
