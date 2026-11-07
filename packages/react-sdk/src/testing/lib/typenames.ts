import {
	buildClientSchema,
	type FieldNode,
	type FragmentDefinitionNode,
	type FragmentSpreadNode,
	type GraphQLObjectType,
	getNamedType,
	type InlineFragmentNode,
	type IntrospectionQuery,
	isObjectType,
	Kind,
	NoFragmentCyclesRule,
	type OperationDefinitionNode,
	parse,
	type SelectionSetNode,
	validate,
} from "graphql";
import introspection from "../__generated__/schema.json";

const schema = buildClientSchema(
	introspection as unknown as IntrospectionQuery,
);

type TFragments = Map<string, FragmentDefinitionNode>;

/**
 * The most steps one `withTypenames` call may take, a step being one selection visited or one
 * object filled. Ordinary queries need a few hundred; the cap stops a query or data shape that
 * multiplies its own work from blocking the thread.
 */
const TRAVERSAL_BUDGET = 100_000;

type TContext = {
	type: GraphQLObjectType;
	fragments: TFragments;
	/** Shared by every step of one call. */
	budget: { remaining: number };
};

/** Counts one step against the call's budget and throws once the budget is spent. */
function spendStep({ budget }: TContext): void {
	budget.remaining -= 1;
	if (budget.remaining < 0) {
		throw new Error(
			`withTypenames: the query and data need more than ${TRAVERSAL_BUDGET} steps; split the query or trim the data`,
		);
	}
}

/** The selections a fragment spread or inline fragment stands for. */
function fragmentSelections(
	selection: FragmentSpreadNode | InlineFragmentNode,
	fragments: TFragments,
): SelectionSetNode | undefined {
	return selection.kind === Kind.FRAGMENT_SPREAD
		? fragments.get(selection.name.value)?.selectionSet
		: selection.selectionSet;
}

/** A field's value with typenames, when the field is an object type with a selection. */
function fillField(
	value: unknown,
	field: FieldNode,
	context: TContext,
): unknown {
	const definition = context.type.getFields()[field.name.value];
	const fieldType = definition ? getNamedType(definition.type) : undefined;
	if (!field.selectionSet || !fieldType || !isObjectType(fieldType)) {
		return value;
	}
	return fill(value, { ...context, type: fieldType }, field.selectionSet);
}

/**
 * Fills `selectionSet`'s fields of `result` in place. `expanded` holds the named fragments already
 * applied to this object: a second spread of one adds nothing, and expanding it again is what made
 * the work double with every level of nesting.
 */
function fillSelections(
	result: Record<string, unknown>,
	context: TContext,
	selectionSet: SelectionSetNode,
	expanded: Set<string>,
): void {
	for (const selection of selectionSet.selections) {
		spendStep(context);
		if (selection.kind !== Kind.FIELD) {
			if (selection.kind === Kind.FRAGMENT_SPREAD) {
				if (expanded.has(selection.name.value)) continue;
				expanded.add(selection.name.value);
			}
			const selections = fragmentSelections(selection, context.fragments);
			if (selections) fillSelections(result, context, selections, expanded);
			continue;
		}
		const key = selection.alias?.value ?? selection.name.value;
		result[key] = fillField(result[key], selection, context);
	}
}

/**
 * A copy of `value` (an object, or a list of them) with `__typename` added at every level the
 * selections reach. Each object gets its own set of expanded fragments, so a fragment spread on
 * two sibling objects is applied to both.
 */
function fill(
	value: unknown,
	context: TContext,
	selectionSet: SelectionSetNode,
	root = false,
): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => fill(item, context, selectionSet));
	}
	if (value === null || typeof value !== "object") return value;
	spendStep(context);
	const result: Record<string, unknown> = {
		...(root ? {} : { __typename: context.type.name }),
		...(value as Record<string, unknown>),
	};
	fillSelections(result, context, selectionSet, new Set());
	return result;
}

/**
 * Adds `__typename` to every object in `data`, as the API sends it, so mocked responses for `query`
 * match fragments and normalize in the client cache.
 */
export function withTypenames<TData>(query: string, data: TData): TData {
	const document = parse(query);
	const cycles = validate(schema, document, [NoFragmentCyclesRule]);
	if (cycles.length > 0) {
		throw new Error(
			`withTypenames: the query has a fragment cycle (${cycles.map((error) => error.message).join("; ")})`,
		);
	}
	const fragments: TFragments = new Map(
		document.definitions
			.filter((definition) => definition.kind === Kind.FRAGMENT_DEFINITION)
			.map((definition) => [definition.name.value, definition]),
	);
	const operation = document.definitions.find(
		(definition): definition is OperationDefinitionNode =>
			definition.kind === Kind.OPERATION_DEFINITION,
	);
	const root = operation && schema.getRootType(operation.operation);
	if (!operation || !root || data === null || data === undefined) return data;
	return fill(
		data,
		{ type: root, fragments, budget: { remaining: TRAVERSAL_BUDGET } },
		operation.selectionSet,
		true,
	) as TData;
}
