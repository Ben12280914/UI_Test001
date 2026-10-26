import type { StoreData } from "@/domain/types";

/**
 * Persistence boundary for the Work Memory. The MVP uses a JSON file;
 * a SQL/Document DB implementation can replace it without touching services.
 */
export interface Store {
  read(): Promise<StoreData>;
  /** Serialized read-modify-write. The mutator may return a value. */
  update<T>(mutator: (data: StoreData) => T | Promise<T>): Promise<T>;
  reset(data: StoreData): Promise<void>;
}
