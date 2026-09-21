import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

// Keep negative zero as well as every authored floating-point value.
const encode = value => JSON.stringify(value, (_, v) => Object.is(v, -0) ? JSON.rawJSON('-0') : v);
const sourcePath = 'public/models/eiffel-construction-kit/tower-kit.manifest.json';
const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const columns = Object.keys(source.parts[0]).map(key => {
  const values = source.parts.map(part => part[key]);
  const pool = [], lookup = new Map();
  const indices = values.map(value => {
    const encoded = encode(value);
    if (!lookup.has(encoded)) { lookup.set(encoded, pool.length); pool.push(value); }
    return lookup.get(encoded);
  });
  const plain = { key, values }, pooled = { key, pool, indices };
  return encode(pooled).length < encode(plain).length ? pooled : plain;
});
const { parts, ...header } = source;
const runtime = encode({ ...header, encoding: 'columns-v1', partCount: parts.length, columns });
await writeFile('public/models/eiffel-construction-kit/tower-kit.runtime.json', runtime);
const city = await readFile('public/models/paris-1889/paris-city.glb');
const compressedCity = gzipSync(city, { level: 9 });
await writeFile('public/models/paris-1889/paris-city.glb.gz', compressedCity);
console.log(JSON.stringify({ parts: parts.length, manifestBytes: Buffer.byteLength(runtime), manifestGzipBytes: gzipSync(runtime).length, cityBytes: city.length, cityGzipBytes: compressedCity.length }, null, 2));
