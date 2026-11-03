type TPageHeadProps = {
	readonly title: string;
	readonly description?: string;
	readonly testId?: string;
};

/** A page's title and what it's for; every screen renders one first. */
export function PageHead({
	title,
	description,
	testId = "page-head",
}: TPageHeadProps) {
	return (
		<div className="page-head" data-testid={testId}>
			<h1>{title}</h1>
			{description ? <p>{description}</p> : null}
		</div>
	);
}
