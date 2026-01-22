import { Mutex } from 'async-mutex';

/** Shared mutex to prevent concurrent access to the
 * Miden WebAssembly client */
export const clientMutex = new Mutex();
