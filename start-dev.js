// Chdir before any require() that might call process.cwd().
// Used by the Claude preview runner which spawns processes in an inaccessible directory.
const path = require("path");
process.chdir(path.dirname(__filename));
process.argv = [process.argv[0], __filename, "dev"];
require("./node_modules/next/dist/bin/next");
