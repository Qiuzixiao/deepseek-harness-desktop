import { defineConfig } from 'tsdown'

const PACKAGE_NAME = 'dsh-product-story-studio'

export default defineConfig([
  {
    name: PACKAGE_NAME,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    sourcemap: true,
  },
  {
    name: `${PACKAGE_NAME}/client`,
    entry: { client: 'src/client/index.tsx' },
    tsconfig: 'tsconfig.client.json',
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    fixedExtension: false,
    dts: false,
    clean: false,
    sourcemap: true,
    external: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-connection/client',
      '@deepseek-ai/dsh-client-locale/client',
      '@deepseek-ai/dsh-client-runtime/client',
      '@deepseek-ai/dsh-client-ui-conversation/client',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-sidebar/client',
      '@deepseek-ai/dsh-client-ui-slots',
    ],
    noExternal: (id: string) => id.startsWith('@deepseek-ai/') ? undefined : true,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
