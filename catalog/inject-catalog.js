// In the final implementation, this script will automatically be run post-install, and 
// `destinationPackagePath` will be hard-coded to the path to the package.json of the consumer package. 
// For now, we run this script manually and pass in the path to the consumer package.json as an argument.
import { workspaces } from "./package.json";
import assert from "assert";
import { parseArgs } from "util";

const CATALOG_NAME = "my-catalog";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    destinationPackagePath: {
      type: "string",
    },
  }
});

const catalog = workspaces?.catalogs?.[CATALOG_NAME];
const { destinationPackagePath } = values;

assert(catalog, `Catalog "${CATALOG_NAME}" not found. Aborting.`);
assert(destinationPackagePath, `No destination package path provided. Aborting.`);

const file = Bun.file(destinationPackagePath);
assert(await file.exists(), `No package.json found at "${destinationPackagePath}". Aborting.`);

const destinationPackageFile = await file.json();

// Workspaces may be absent, an array of globs, or an object; normalise to object form
const existingWorkspaces = destinationPackageFile.workspaces;
const workspacesObject = Array.isArray(existingWorkspaces)
  ? { packages: existingWorkspaces }
  : { ...existingWorkspaces };

workspacesObject.catalogs = {
  ...workspacesObject.catalogs,
  [CATALOG_NAME]: catalog,
};

destinationPackageFile.workspaces = workspacesObject;

await Bun.write(destinationPackagePath, JSON.stringify(destinationPackageFile, null, 2) + "\n");

console.log(`Injected catalog "${CATALOG_NAME}" into ${destinationPackagePath}`);
