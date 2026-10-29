import type { Rule } from "eslint";

interface MockReport {
	messageId: string;
	data?: Record<string, string>;
	node?: unknown;
	loc?: unknown;
}

interface MockContextOptions {
	filename?: string;
	sourceText?: string;
	options?: unknown[];
}

export function createMockContext(opts: MockContextOptions = {}): {
	context: Rule.RuleContext;
	reports: MockReport[];
} {
	const {
		filename = "src/component.tsx",
		sourceText = "",
		options = [],
	} = opts;
	const reports: MockReport[] = [];

	const context = {
		filename,
		getFilename: () => filename,
		sourceCode: { text: sourceText },
		options,
		report(descriptor: MockReport) {
			reports.push(descriptor);
		},
	} as unknown as Rule.RuleContext;

	return { context, reports };
}
