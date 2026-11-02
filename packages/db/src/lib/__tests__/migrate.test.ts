import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrationsFolder } from "../migrate";

describe("migrationsFolder", () => {
	it("points at the folder drizzle-kit generates, journal included", () => {
		expect(existsSync(join(migrationsFolder, "meta", "_journal.json"))).toBe(
			true,
		);
	});
});
