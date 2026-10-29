// Combines every workspace's coverage-final.json into coverage/ at the root,
// the one file fallow reads in CI. Run by the root `test:coverage` after turbo
// has produced each workspace's report.
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import libCoverage from "istanbul-lib-coverage";

// fileURLToPath, not URL.pathname: pathname keeps %20 for a space, so a
// checkout under a path with a space would look for a folder that isn't there.
const root = fileURLToPath(new URL("..", import.meta.url));
const map = libCoverage.createCoverageMap({});
const merged = [];

for (const group of ["apps", "packages"]) {
	const groupDir = join(root, group);
	if (!existsSync(groupDir)) continue;
	for (const workspace of readdirSync(groupDir)) {
		const report = join(groupDir, workspace, "coverage", "coverage-final.json");
		if (!existsSync(report)) continue;
		map.merge(JSON.parse(readFileSync(report, "utf8")));
		merged.push(`${group}/${workspace}`);
	}
}

if (merged.length === 0) {
	console.error(
		"merge-coverage: no coverage-final.json found; run test:coverage first",
	);
	process.exit(1);
}

mkdirSync(join(root, "coverage"), { recursive: true });
writeFileSync(
	join(root, "coverage", "coverage-final.json"),
	JSON.stringify(map.toJSON()),
);
console.log(
	`merge-coverage: ${map.files().length} files from ${merged.join(", ")}`,
);
