import type { EiffelKitManifest, EiffelKitPart } from './eiffelKitTypes';

type Column = { key: keyof EiffelKitPart } & (
  | { values: readonly unknown[] }
  | { pool: readonly unknown[]; indices: readonly number[] }
);
export interface EiffelKitRuntime extends Omit<EiffelKitManifest, 'parts'> {
  readonly encoding: 'columns-v1';
  readonly partCount: number;
  readonly columns: readonly Column[];
}

/** Lossless delivery encoding; shared values are immutable authored records. */
export function decodeEiffelKitRuntime(input: EiffelKitRuntime): EiffelKitManifest {
  if (input.encoding !== 'columns-v1' || input.schemaVersion !== 2 ||
      !Number.isInteger(input.partCount) || input.partCount < 1) {
    throw new Error('Unsupported Eiffel construction kit encoding');
  }
  const { encoding: _encoding, partCount, columns, ...header } = input;
  const parts = Array.from({ length: partCount }, () => ({} as Record<string, unknown>));
  for (const column of columns) {
    const values = 'values' in column ? column.values : column.indices.map(index => {
      if (!Number.isInteger(index) || index < 0 || index >= column.pool.length) {
        throw new Error(`Invalid Eiffel kit dictionary: ${column.key}`);
      }
      return column.pool[index];
    });
    if (values.length !== partCount) throw new Error(`Incomplete Eiffel kit column: ${column.key}`);
    for (let i = 0; i < partCount; i++) parts[i]![column.key] = values[i];
  }
  return { ...header, parts: parts as unknown as EiffelKitPart[] };
}
