import { CompressionMethod } from './tar-utils';

export interface CacheActionMetadata {
  metadata: {
    'Cache-Action-Compression-Method': CompressionMethod;
  };
}
