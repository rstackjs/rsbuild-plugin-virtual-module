# rsbuild-plugin-virtual-module🧙

The simplest and most flexible way to build with a compiling magic 🪄

An Rsbuild plugin that allows you to create virtual modules, the pro version of [rspack-plugin-virtual-module](https://github.com/rstackjs/rspack-plugin-virtual-module) with loader API.

<p>
  <a href="https://npmjs.com/package/rsbuild-plugin-virtual-module">
   <img src="https://img.shields.io/npm/v/rsbuild-plugin-virtual-module?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  <a href="https://npmcharts.com/compare/rsbuild-plugin-virtual-module?minimal=true"><img src="https://img.shields.io/npm/dm/rsbuild-plugin-virtual-module.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
</p>

## Usage

Install:

```bash
npm add rsbuild-plugin-virtual-module -D
```

Add plugin to your `rsbuild.config.ts`:

```ts
// rsbuild.config.ts
import { pluginVirtualModule } from 'rsbuild-plugin-virtual-module';

export default {
  plugins: [
    pluginVirtualModule({
      virtualModules: {
        'virtual-foo': async () => {
          return 'export default {}';
        },
      },
    }),
  ],
};
```

```ts
import foo from 'virtual-foo';

console.log(foo); // {}
```

## Options

### virtualModules

Generate virtual modules, where the key is the name of the virtual module and the value is `TransformHandler`. See [Rsbuild - api.transform](https://rsbuild.dev/plugins/dev/core#apitransform)

- Type:

```ts
import type { TransformHandler } from '@rsbuild/core';

type VirtualModules = Record<string, TransformHandler>;
```

- Default: `{}`
- Example:

```js
pluginVirtualModule({
  virtualModules: {
    'virtual-json-list': async ({ addDependency, addContextDependency }) => {
      const jsonFolderPath = join(__dirname, 'json');
      const ls = await readdir(jsonFolderPath);
      addContextDependency(jsonFolderPath);

      const res: Record<string, unknown> = {};
      for (const file of ls) {
        if (file.endsWith('.json')) {
          const jsonFilePath = join(jsonFolderPath, file);
          const jsonContent = await readFile(jsonFilePath, 'utf-8');
          addDependency(jsonFilePath);
          res[file] = JSON.parse(jsonContent);
        }
      }

      return `export default ${JSON.stringify(res)}`;
    },
  },
});
```

```js
import jsonList from 'virtual-json-list';
console.log(jsonList);
```

### tempDir

The name of the virtual module folder based on `api.context.rootPath`

- Type: `string`
- Default: `.rsbuild-virtual-module`
- Example:

```js
pluginVirtualModule({
  tempDir: 'src',
  virtualModules: {
    'virtual-foo': async () => {
      return 'export default {}';
    },
  },
});
```

The actual virtual module is `./src/virtual-foo.js`

## License

[MIT](./LICENSE).
