# Catalogs

A sandbox for sharing one set of dependency versions across separate projects with [Bun catalogs](https://bun.com/docs/install/catalogs).

NB: To ship this proof of concept faster, I used Bun APIs to read and write files and to read command-line arguments. The final version will use only Node's built-in modules, and will write the catalog where each package manager reads it: `catalogs` in `pnpm-workspace.yaml` for pnpm, and `workspaces.catalogs` in the root `package.json` for Bun.

## Why

A Bun workspace root can declare dependency versions once under `workspaces.catalogs`. Packages then ask for `catalog:<name>` instead of pinning their own versions. That works inside one monorepo. This solution doesn't work across multiple repositories, because Bun only reads catalogs from the workspace root's `package.json`.

This project tries a workaround: 
- The `catalog` package owns the Catalog. 
- A script copies that catalog into a destination project's `package.json`, so the destination can use `catalog:my-catalog` and get the central versions.

In the final implementation, the catalog injection script will likely be called in a post-install hook so that the catalog is updated whenever the consumer installs a new version of the catalog package. 

For this proof-of-concept, we run the injection script manually (see the Structure section for a breakdown of how the script works).

Bun skips dependency postinstall scripts by default, so each consuming project will need to list the catalog package in `trustedDependencies` or will have to run the injection script manually after install.

## Structure

```
.
├── catalog/                 # Source of truth for shared dependency versions
│   ├── package.json         # Defines workspaces.catalogs["my-catalog"]
│   └── inject-catalog.js    # Copies my-catalog into a destination package.json
└── consumer/                # Example project that receives the catalog
    └── package.json         # Target of the injection
```

### `catalog/`

Its `package.json` defines the canonical catalog under `workspaces.catalogs["my-catalog"]`. It also depends on `react` through `catalog:my-catalog`, which checks that the catalog resolves in its own install.

### `catalog/inject-catalog.js`

The script reads `my-catalog` from `catalog/package.json` and writes it to the destination's `workspaces.catalogs["my-catalog"]`.

- `--destinationPackagePath` takes a path to to `package.json`.
- It writes only `workspaces.catalogs["my-catalog"]` and keeps the rest of the destination's workspace config, other catalogs included.
- If the destination project does not define a workspace (i.e. is not a monorepo), it defines an empty workspace, and injects the catalog there.
- It doesn't add `catalog:` references to the destination's dependencies, and it doesn't run `bun install`. It is up to users of the destination project to point to the catalog versions they care about.

```sh
cd catalog
bun inject-catalog.js --destinationPackagePath ../consumer/package.json
```


### `consumer/`

A standalone Bun project that receives the injected `my-catalog` catalog.