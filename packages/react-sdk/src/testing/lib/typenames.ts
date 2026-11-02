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
	type OperationDefinitionNode,
	parse,
	type SelectionSetNode,
} from "graphql";
import introspection from "../__generated__/schema.json";

const schema = buildClientSchema(
	introspection as unknown as IntrospectionQuery,
);

type TFragments = Map<string, FragmentDefinitionNode>;

type TContext = { type: GraphQLObjectType; fragments: TFragments };

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
	{ type, fragments }: TContext,
): unknown {
	const definition = type.getFields()[field.name.value];
	const fieldType = definition ? getNamedType(definition.type) : undefined;
	if (!field.selectionSet || !fieldType || !isObjectType(fieldType)) {
		return value;
	}
	return fill(value, { type: fieldType, fragments }, field.selectionSet);
}

/** Fills `selectionSet`'s fields of `result` in place. */
function fillSelections(
	result: Record<string, unknown>,
	context: TContext,
	selectionSet: SelectionSetNode,
): void {
	for (const selection of selectionSet.selections) {
		if (selection.kind !== Kind.FIELD) {
			const selections = fragmentSelections(selection, context.fragments);
			if (selections) fillSelections(result, context, selections);
			continue;
		}
		const key = selection.alias?.value ?? selection.name.value;
		result[key] = fillField(result[key], selection, context);
	}
}

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
	const result: Record<string, unknown> = {
		...(root ? {} : { __typename: context.type.name }),
		...(value as Record<string, unknown>),
	};
	fillSelections(result, context, selectionSet);
	return result;
}

/**
 * Adds `__typename` to every object in `data`, as the API sends it, so mocked responses for `query`
 * match fragments and normalize in the client cache.
 */
export function withTypenames<TData>(query: string, data: TData): TData {
	const document = parse(query);
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
		{ type: root, fragments },
		operation.selectionSet,
		true,
	) as TData;
}
