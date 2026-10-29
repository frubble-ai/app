// Runs from postinstall. husky is a dev dependency, so an install without it —
// a production or focused install — skips the hooks instead of failing.
try {
	const { default: husky } = await import("husky");
	const message = husky();
	if (message) console.log(message);
} catch (error) {
	if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
}
