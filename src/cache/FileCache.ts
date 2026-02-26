// fileCache.ts
export const MAX_CACHE_ITEMS = 500;
import { ReadStream } from "fs";
import { Readable } from "stream";
class FileCache {
  private cache = new Map<
    string,
    | {
        type: string;
        path: string;
        size: number;
        data: string | Buffer<ArrayBufferLike>;
        contentType: string;
      }
    | {
        type: string;
        data: ReadStream;
        path: string;
        size: number;
        contentType: string;
      }
  >();

  public get(filePath: string) {
    if (!this.cache.has(filePath)) {
      return null;
    }

    // LRU trick: Delete and re-insert to push it to the "newest" end of the Map
    const data = this.cache.get(filePath)!;
    this.cache.delete(filePath);
    this.cache.set(filePath, data);

    return data;
  }

  public set(filePath: string, fileResult: any) {
    const isStream =
      fileResult.data && typeof fileResult.data.pipe === "function";
    // CRITICAL: Never cache open streams! They are single-use.
    if (isStream) {
      return;
    }

    this.cache.set(filePath, fileResult);

    // Prevent memory leaks by evicting the oldest item if we exceed the limit
    if (this.cache.size > MAX_CACHE_ITEMS) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  public delete(filePath: string) {
    this.cache.delete(filePath);
  }

  public has(filePath: string) {
    return this.cache.has(filePath);
  }
}

export const fileCache = new FileCache();
