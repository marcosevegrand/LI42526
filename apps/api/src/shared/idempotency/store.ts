export type IdempotencyRecord = {
  key: string;
  fingerprint: string;
  createdAt: string;
};

const store = new Map<string, IdempotencyRecord>();

export function rememberIdempotencyRecord(record: IdempotencyRecord) {
  store.set(record.key, record);
}

export function getIdempotencyRecord(key: string) {
  return store.get(key) ?? null;
}
