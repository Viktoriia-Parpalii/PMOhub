import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const assets = path.resolve('dist/assets');
const entries = (await readdir(assets)).filter((name) => /^index-.*\.js$/.test(name));
if (entries.length !== 1) throw new Error(`Expected one initial JS bundle, found ${entries.length}`);
const size = (await stat(path.join(assets, entries[0]))).size;
const limit = 500 * 1024;
if (size > limit) throw new Error(`Initial JS bundle is ${size} bytes; limit is ${limit}`);
console.log(`Initial JS bundle: ${size} / ${limit} bytes`);
