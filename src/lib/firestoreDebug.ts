// src/lib/firestoreDebug.ts
import { onSnapshot, Query, DocumentReference, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore';

export function onSnapshotDebug<T>(
  target: Query<T> | DocumentReference<T>,
  next: ((snap: QuerySnapshot<T> | DocumentSnapshot<T>) => void),
  error?: (err: unknown) => void
) {
  const where = (() => {
    // Firebase no expone string del query, así que armamos una etiqueta útil
    const anyT: any = target as any;
    if (anyT.type === 'query') {
      const collId = anyT._query?.path?.segments?.join('/') ?? '<unknown>';
      const filters = JSON.stringify(anyT._query?.filters ?? []);
      const orderBy = JSON.stringify(anyT._query?.explicitOrderBy ?? []);
      return `QUERY ${collId} filters=${filters} orderBy=${orderBy}`;
    }
    const ref = target as DocumentReference<T>;
    return `DOC ${ref.path}`;
  })();

  const wrappedErr = (e: unknown) => {
    console.error('[FS onSnapshot ERROR]', where, e);
    error?.(e);
  };

  console.log('[FS onSnapshot SUBSCRIBE]', where);
  return onSnapshot(target as any, next as any, wrappedErr);
}
