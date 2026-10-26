import { promises as fs } from "node:fs";
import path from "node:path";
import type { StoreData } from "@/domain/types";
import { dataDir } from "../config";
import { emptyStore } from "./defaults";
import type { Store } from "./store";

class JsonFileStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  private cache: StoreData | null = null;

  constructor(private readonly file: string) {}

  private async load(): Promise<StoreData> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.file, "utf8");
      this.cache = { ...emptyStore(), ...(JSON.parse(raw) as StoreData) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      this.cache = emptyStore();
    }
    return this.cache;
  }

  private async persist(data: StoreData): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, this.file);
  }

  async read(): Promise<StoreData> {
    // Wait for in-flight writes so readers never see a half-applied mutation.
    await this.queue.catch(() => undefined);
    return structuredClone(await this.load());
  }

  update<T>(mutator: (data: StoreData) => T | Promise<T>): Promise<T> {
    const run = async () => {
      const working = structuredClone(await this.load());
      const result = await mutator(working);
      await this.persist(working);
      this.cache = working;
      return result;
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async reset(data: StoreData): Promise<void> {
    await this.update((d) => {
      Object.assign(d, data);
    });
  }
}

// Survive Next.js dev hot reloads: one store instance per process.
const g = globalThis as unknown as { __tkgStore?: Store };

export function getStore(): Store {
  if (!g.__tkgStore) g.__tkgStore = new JsonFileStore(path.join(dataDir(), "store.json"));
  return g.__tkgStore;
}
