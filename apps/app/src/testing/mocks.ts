import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Keys come back prefixed with their namespace (domain), e.g. "auth.errors.generic": tests assert
// on keys, never on copy
vi.mock("react-i18next", async () => import("./mock-react-i18next"));

afterEach(() => {
	cleanup();
	window.localStorage.clear();
});
