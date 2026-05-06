import { createClient } from "@supabase/supabase-js";

// navigator.locks deadlocks with React StrictMode's double-invocation.
// This simple queue-based lock prevents the hang without the browser lock API.
let _lockQueue = Promise.resolve();
function resolvedLock<T>(_name: string, _acquireTimeout: number, fn: () => Promise<T>): Promise<T> {
  const next = _lockQueue.then(() => fn());
  _lockQueue = next.then(() => {}, () => {});
  return next;
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      lock: resolvedLock,
    },
  }
);
