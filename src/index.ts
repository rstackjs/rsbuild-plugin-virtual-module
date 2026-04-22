import { extname, join } from 'node:path';
import type { RsbuildPlugin, TransformHandler } from '@rsbuild/core';

type VirtualModules = Record<string, TransformHandler>;
interface PluginVirtualModuleOptions {
  /**
   * Generate virtual modules, where the key is the name of the virtual module and the value is `TransformHandler`. See [Rsbuild - api.transform](https://rsbuild.dev/plugins/dev/core#apitransform)
   */
  virtualModules?: VirtualModules;
  /**
   * The name of the virtual module folder based on `api.context.rootPath`
   * @default '.rsbuild-virtual-module'
   */
  tempDir?: string;
}

const PLUGIN_VIRTUAL_MODULE_NAME = 'rsbuild:virtual-module';

const pluginVirtualModule = (
  pluginOptions: PluginVirtualModuleOptions = {},
): RsbuildPlugin => ({
  name: PLUGIN_VIRTUAL_MODULE_NAME,
  async setup(api) {
    const {
      virtualModules = {},
      tempDir: virtualFolderName = '.rsbuild-virtual-module',
    } = pluginOptions;
    const TEMP_DIR = join(api.context.rootPath, virtualFolderName);

    const virtualFileAbsolutePaths: [string, string][] = Object.keys(
      virtualModules,
    ).map((i) => {
      let absolutePath = join(TEMP_DIR, i);
      if (!extname(absolutePath)) {
        absolutePath = `${absolutePath}.js`;
      }
      return [i, absolutePath];
    });

    api.modifyBundlerChain((chain, { rspack }) => {
      // 1. create empty files in memfs
      const pluginId = 'RSBUILD_VIRTUAL_MODULE_PLUGIN';
      const virtualModules = Object.fromEntries(
        virtualFileAbsolutePaths.map((i) => {
          return [i[1], ''];
        }),
      );
      if (chain.plugins.has(pluginId)) {
        // allow multiple rsbuild pluginVirtualModule
        chain.plugin(pluginId).tap((options) => {
          // keys should not be conflicted, otherwise panic
          const existingPaths = new Set(Object.keys(options[0] ?? {}));
          const conflictPath = virtualFileAbsolutePaths.find(([, path]) =>
            existingPaths.has(path),
          );
          if (conflictPath) {
            throw new Error(
              `Virtual module name conflicted: ${conflictPath[0]}`,
            );
          }

          return [
            {
              ...options[0],
              ...virtualModules,
            },
          ];
        });
      } else {
        chain
          .plugin(pluginId)
          .use(rspack.experiments.VirtualModulesPlugin, [virtualModules]);
      }
      // 2. add alias for virtual modules
      chain.resolve.alias.merge(Object.fromEntries(virtualFileAbsolutePaths));
    });

    // 3. use loader to transform virtual modules
    for (const [moduleName, absolutePath] of virtualFileAbsolutePaths) {
      const handler = virtualModules[moduleName];
      if (!handler) {
        continue;
      }
      api.transform({ test: absolutePath }, handler);
    }
  },
});

export type { PluginVirtualModuleOptions, VirtualModules };
export { PLUGIN_VIRTUAL_MODULE_NAME, pluginVirtualModule };
