import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
  resolve: {
    alias: [
      // Client-side plugin imports (e.g. @deepseek-ai/dsh-client-ui-primitives)
      // transitively pull in KaTeX's CSS for math rendering. Node's ESM
      // loader cannot resolve non-JS imports without a bundler transform;
      // unit tests exercise plugin logic, not stylesheet loading, so stub
      // every CSS import to an empty module. The exact bare specifier is
      // aliased directly because katex's package.json exports map does not
      // expose ./dist/katex.min.css as a resolvable subpath from here.
      { find: 'katex/dist/katex.min.css', replacement: '/dev/null' },
      { find: /\.css$/, replacement: '/dev/null' },
    ],
  },
  ssr: {
    // node_modules are externalized (passed straight to Node's loader) by
    // default under SSR/node test environments, bypassing Vite's transform
    // and therefore the CSS alias above. Force this package through Vite's
    // pipeline so the alias actually applies to its transitive CSS import.
    noExternal: ['@deepseek-ai/dsh-client-ui-primitives'],
  },
})
