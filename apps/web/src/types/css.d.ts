// Ambient declarations for stylesheet imports.
//
// TypeScript 6 (TS2882) requires side-effect imports of non-code assets
// (e.g. `import '@mantine/core/styles.css'`) to have a module declaration.
// CSS Modules keep their typed default export; plain global stylesheets are
// declared as side-effect-only modules.

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css';
