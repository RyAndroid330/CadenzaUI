const DEFAULT_TIMEOUT_MS = 20_000;

function buildDelegationUrl(address: string, port: number): string {
  if (address.includes('://')) {
    return `${address.replace(/\/+$/, '')}/delegation`;
  }
  return `http://${address}:${port}/delegation`;
}

export async function delegateQuery<T = Record<string, unknown>>(
  address: string,
  port: number,
  taskName: string,
  queryData: Record<string, unknown> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T[]> {
  const url = buildDelegationUrl(address, port);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queryData, __remoteRoutineName: taskName }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Delegation to '${taskName}' failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (data?.errored || data?.failed || data?.__success === false) {
    throw new Error(String(data?.__error ?? `Delegation '${taskName}' returned an error`));
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}
