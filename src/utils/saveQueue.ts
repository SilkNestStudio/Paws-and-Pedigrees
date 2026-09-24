type SaveTask = () => Promise<unknown>;

/** Coalesce snapshots per record, never across dogs/profiles. Serialize writes so
 * an older request cannot finish after a newer snapshot and overwrite it. */
export class SaveQueue {
  private pending = new Map<string, SaveTask>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<boolean> | undefined;

  schedule(key: string, task: SaveTask, delay = 1000) {
    this.pending.set(key, task);
    // Do not postpone indefinitely while the player keeps interacting.
    if (!this.timer) this.timer = setTimeout(() => { void this.flush(); }, delay);
  }

  async flush(): Promise<boolean> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.running) {
      await this.running;
      return this.pending.size ? this.flush() : true;
    }
    const batch = [...this.pending];
    this.pending.clear();
    this.running = (async () => {
      let success = true;
      for (const [key, task] of batch) {
        try {
          if (await task() === false) throw new Error(`Save failed: ${key}`);
        } catch {
          success = false;
          // Retain for the next autosave, unless a newer snapshot is queued.
          if (!this.pending.has(key)) this.pending.set(key, task);
        }
      }
      return success;
    })();
    try { return await this.running; }
    finally { this.running = undefined; }
  }
}
