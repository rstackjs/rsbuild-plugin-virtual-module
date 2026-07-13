import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@rstest/playwright';
import { createRsbuild } from '@rsbuild/core';
import { pluginVirtualModule } from 'rsbuild-plugin-virtual-module';
import { getRandomPort } from '../helper';

const __dirname = dirname(fileURLToPath(import.meta.url));

const C_JSON_PATH = join(__dirname, 'json', 'c.json');

test.describe('pluginVirtualModule', () => {
  let cJsonOriginalContent: string;
  test.beforeAll(async () => {
    cJsonOriginalContent = await readFile(C_JSON_PATH, 'utf-8');
  });

  test.afterEach(async () => {
    // restore c.json
    await writeFile(C_JSON_PATH, cJsonOriginalContent);
  });

  test('dev - should render page as expected and trigger hmr', async ({
    page,
  }) => {
    const rsbuild = await createRsbuild({
      cwd: __dirname,
      rsbuildConfig: {
        plugins: [
          pluginVirtualModule({
            virtualModules: {
              'virtual-json-list': async ({
                addDependency,
                addContextDependency,
              }) => {
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
              'nested/1/2/3/test.mjs': async () => {
                return 'export default {}';
              },
            },
          }),
        ],
        server: {
          port: await getRandomPort(),
        },
      },
    });

    const { server, urls } = await rsbuild.startDevServer();

    await page.goto(urls[0]);
    expect(await page.evaluate('window.test')).toEqual({
      '_meta.json': [{ name: 'test-dir', type: 'dir' }, 'c', 'd'],
      'c.json': { c: '3' },
      'd.json': { d: 4 },
    });

    await writeFile(C_JSON_PATH, '{ "c": "3333333" }');

    await page.waitForTimeout(500);
    expect(await page.evaluate('window.test')).toMatchObject({
      '_meta.json': [{ name: 'test-dir', type: 'dir' }, 'c', 'd'],
      'c.json': { c: '3333333' },
      'd.json': { d: 4 },
    });

    await server.close();
  });

  test('build - should build succeed', async ({ page }) => {
    const originalJson = {
      '_meta.json': [{ name: 'test-dir', type: 'dir' }, 'c', 'd'],
      'c.json': { c: '3' },
      'd.json': { d: 4 },
    };
    const rsbuild = await createRsbuild({
      cwd: __dirname,
      rsbuildConfig: {
        plugins: [
          pluginVirtualModule({
            virtualModules: {
              'virtual-json-list': async () => {
                return `export default ${JSON.stringify(originalJson)};`;
              },
              'nested/1/2/3/test.mjs': async () => {
                return `export default ${JSON.stringify({ a: 1, b: 2 })};`;
              },
            },
          }),
        ],
      },
    });

    await rsbuild.build();
    const { server, urls } = await rsbuild.preview();

    await page.goto(urls[0]);
    expect(await page.evaluate('window.test')).toMatchObject(originalJson);
    expect(await page.evaluate('window.nestedJson')).toMatchObject({
      a: 1,
      b: 2,
    });

    await server.close();
  });

  test('build - should allow multiple plugins', async ({ page }) => {
    const originalJson = {
      '_meta.json': [{ name: 'test-dir', type: 'dir' }, 'c', 'd'],
      'c.json': { c: '3' },
      'd.json': { d: 4 },
    };
    const rsbuild = await createRsbuild({
      cwd: __dirname,
      rsbuildConfig: {
        plugins: [
          pluginVirtualModule({
            virtualModules: {
              'virtual-json-list': async () => {
                return `export default ${JSON.stringify(originalJson)};`;
              },
            },
          }),
          pluginVirtualModule({
            virtualModules: {
              'nested/1/2/3/test.mjs': async () => {
                return `export default ${JSON.stringify({ a: 1, b: 2 })};`;
              },
            },
          }),
        ],
      },
    });

    await rsbuild.build();
    const { server, urls } = await rsbuild.preview();

    await page.goto(urls[0]);
    expect(await page.evaluate('window.test')).toMatchObject(originalJson);
    expect(await page.evaluate('window.nestedJson')).toMatchObject({
      a: 1,
      b: 2,
    });

    await server.close();
  });
});
