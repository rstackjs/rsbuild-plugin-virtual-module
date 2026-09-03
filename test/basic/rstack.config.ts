// Configuration guide: https://rstack.rs/config
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { define } from 'rstack';
import { pluginVirtualModule } from 'rsbuild-plugin-virtual-module';

define.app({
  plugins: [
    pluginVirtualModule({
      virtualModules: {
        'virtual-json-list': async ({
          addDependency,
          addContextDependency,
        }) => {
          const jsonFolderPath = join(import.meta.dirname, 'json');
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
    }),
  ],
});
