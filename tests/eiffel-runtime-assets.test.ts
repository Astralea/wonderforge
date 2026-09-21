import { readFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeEiffelKitRuntime, type EiffelKitRuntime } from '../src/data/eiffelKitRuntime';
import { decodeParisCityBuffer } from '../src/render/three/eiffelParis';

const directory = 'public/models/eiffel-construction-kit/';
describe('Eiffel runtime delivery', () => {
  it('restores every authored field, identity and floating-point pose exactly', () => {
    const source = readFileSync(`${directory}tower-kit.manifest.json`);
    const packed = readFileSync(`${directory}tower-kit.runtime.json`);
    expect(decodeEiffelKitRuntime(JSON.parse(packed.toString()))).toEqual(JSON.parse(source.toString()));
    expect(packed.length).toBeLessThan(source.length * .25);
    expect(gzipSync(packed).length).toBeLessThan(gzipSync(source).length * .6);
  });
  it('rejects a truncated dictionary rather than silently changing a part', () => {
    const packed = JSON.parse(readFileSync(`${directory}tower-kit.runtime.json`, 'utf8')) as EiffelKitRuntime;
    const dictionary = packed.columns.find(column => 'pool' in column)!;
    expect(() => decodeEiffelKitRuntime({ ...packed, columns: [{ ...dictionary, pool: [], indices: [0] }] })).toThrow('Invalid Eiffel kit dictionary');
  });
  it('preserves the Paris GLB byte for byte while cutting transfer size by over half', async () => {
    const source = readFileSync('public/models/paris-1889/paris-city.glb');
    const packed = readFileSync('public/models/paris-1889/paris-city.glb.gz');
    expect(gunzipSync(packed).equals(source)).toBe(true);
    const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    expect(Buffer.from(await new Response(stream).arrayBuffer()).equals(source)).toBe(true);
    const raw = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    // Vite serves .gz with Content-Encoding, while a raw CDN/file may not.
    expect(await decodeParisCityBuffer(raw)).toBe(raw);
    const compressed = packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength);
    expect(Buffer.from(await decodeParisCityBuffer(compressed)).equals(source)).toBe(true);
    expect(packed.length).toBeLessThan(source.length * .4);
  });
});
