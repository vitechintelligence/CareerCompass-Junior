// Execute repository modules with controlled session/database/network boundaries.
// These tests do not claim authenticated browser or live-service acceptance.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loader(mocks = {}, env = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(root, file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const loadedModule = { exports: {} }; cache.set(resolved, loadedModule);
    const compiled = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: resolved,
    }).outputText;
    function resolve(base) {
      for (const suffix of ['', '.ts', '.tsx']) {
        if (fs.existsSync(path.join(root, base + suffix))) return load(base + suffix);
      }
      throw Error(`Missing module: ${base}`);
    }
    const localRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return resolve(name.slice(2));
      if (name.startsWith('.')) return resolve(path.relative(root, path.resolve(path.dirname(resolved), name)));
      return require(name);
    };
    vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports, require: localRequire,
      process: { env }, URL, Response, Request, Headers, FormData, File, Blob, AbortSignal, Error, TypeError, SyntaxError,
      TextDecoder, TextEncoder, console, Buffer, setTimeout, structuredClone, ...globals }, { filename: resolved });
    return loadedModule.exports;
  }
  return load;
}
module.exports = { loader };
