import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  TransactWriteCommand,
  type ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
export type RecordItem = { pk: string; [key: string]: unknown };
const table = process.env.TABLE_NAME;
const client = table ? DynamoDBDocumentClient.from(new DynamoDBClient({})) : null;
const file = path.join(process.cwd(), '.data', 'eventforge.json');
let queue = Promise.resolve();
async function read(): Promise<Record<string, RecordItem>> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw e;
  }
}
export async function get(pk: string): Promise<RecordItem | undefined> {
  if (client)
    return (
      await client.send(new GetCommand({ TableName: table, Key: { pk }, ConsistentRead: true }))
    ).Item as RecordItem | undefined;
  await queue;
  return (await read())[pk];
}
export async function list(prefix: string): Promise<RecordItem[]> {
  if (client) {
    const items: RecordItem[] = [];
    let cursor;
    do {
      const out: ScanCommandOutput = await client.send(
        new ScanCommand({
          TableName: table,
          ConsistentRead: true,
          FilterExpression: 'begins_with(pk, :p)',
          ExpressionAttributeValues: { ':p': prefix },
          ExclusiveStartKey: cursor,
        }),
      );
      items.push(...((out.Items || []) as RecordItem[]));
      cursor = out.LastEvaluatedKey;
    } while (cursor);
    return items;
  }
  await queue;
  return Object.values(await read()).filter((x) => x.pk.startsWith(prefix));
}
export async function transact(items: { item: RecordItem; unique?: boolean }[]) {
  if (client) {
    await client.send(
      new TransactWriteCommand({
        TransactItems: items.map(({ item, unique }) => ({
          Put: {
            TableName: table,
            Item: item,
            ...(unique ? { ConditionExpression: 'attribute_not_exists(pk)' } : {}),
          },
        })),
      }),
    );
    return;
  }
  const operation = queue.then(async () => {
    const records = await read();
    if (items.some((x) => x.unique && records[x.item.pk])) throw new Error('CONFLICT');
    for (const { item } of items) records[item.pk] = item;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file + '.tmp', JSON.stringify(records));
    await rename(file + '.tmp', file);
  });
  queue = operation.catch(() => {});
  await operation;
}
export async function put(item: RecordItem, unique = false) {
  if (client && !unique) {
    await client.send(new PutCommand({ TableName: table, Item: item }));
    return;
  }
  await transact([{ item, unique }]);
}
// A fixed-window account limiter. TTL removes old counters in DynamoDB.
export async function consumeAttempt(key: string, limit = 10) {
  const window = Math.floor(Date.now() / 900000);
  const pk = `LIMIT#${key}#${window}`,
    expiresAt = (window + 1) * 900;
  if (client) {
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    try {
      await client.send(
        new UpdateCommand({
          TableName: table,
          Key: { pk },
          UpdateExpression: 'SET expiresAt = :ttl ADD attempts :one',
          ConditionExpression: 'attribute_not_exists(attempts) OR attempts < :limit',
          ExpressionAttributeValues: { ':ttl': expiresAt, ':one': 1, ':limit': limit },
        }),
      );
      return true;
    } catch (e) {
      if ((e as Error).name === 'ConditionalCheckFailedException') return false;
      throw e;
    }
  }
  let allowed = false;
  const operation = queue.then(async () => {
    const records = await read();
    const attempts = Number(records[pk]?.attempts || 0);
    if (attempts >= limit) return;
    allowed = true;
    records[pk] = { pk, attempts: attempts + 1, expiresAt };
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file + '.tmp', JSON.stringify(records));
    await rename(file + '.tmp', file);
  });
  queue = operation.catch(() => {});
  await operation;
  return allowed;
}
