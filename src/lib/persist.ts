/** Event the ToastProvider listens to, so background save failures are visible. */
export const WRITE_ERROR_EVENT = 'dudex_write_error';

type QueryResult = { error: { message: string } | null };

/**
 * Runs a Supabase write in the background and reports failure. Supabase
 * resolves (it does not reject) when the database refuses a write, so the
 * `{ error }` of the result is checked. On failure the user sees a toast and
 * `onFail` (usually a refetch) puts the screen back in line with the database.
 */
export function persist(query: PromiseLike<QueryResult>, what: string, onFail?: () => unknown): void {
  const fail = (message: string) => {
    console.error(`${what} failed:`, message);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(WRITE_ERROR_EVENT, { detail: `${what} failed: ${message}` }));
    }
    if (onFail) {
      Promise.resolve()
        .then(onFail)
        .catch((err) => console.error('Reload after a failed save also failed:', err));
    }
  };
  Promise.resolve(query).then(
    (result) => {
      if (result?.error) fail(result.error.message);
    },
    (err: unknown) => fail(err instanceof Error ? err.message : String(err)),
  );
}

function reportWriteFailure(what: string, message: string): void {
  console.error(`${what} failed:`, message);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WRITE_ERROR_EVENT, { detail: `${what} failed: ${message}` }));
  }
}

/** `.then(writeResult('Saving X'), writeFailure('Saving X'))` for a background Supabase write. */
export function writeResult(what: string) {
  return (result: QueryResult | null | undefined): void => {
    if (result?.error) reportWriteFailure(what, result.error.message);
  };
}

export function writeFailure(what: string) {
  return (err: unknown): void => reportWriteFailure(what, err instanceof Error ? err.message : String(err));
}
