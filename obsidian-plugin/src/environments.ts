// Launch environments from vault/agents/_shared/ENVIRONMENTS.yml: this machine, or an ssh host with its own vault clone.

export interface Environment {
	name: string;
	/** ssh target; unset for this machine. */
	host?: string;
	/** Absolute vault path on the host. */
	vault?: string;
	/** Short mark for the machine, e.g. an emoji. */
	icon?: string;
}

export const LOCAL_ENVIRONMENT: Environment = { name: "Local" };

const LAUNCH_SCRIPT = "agents/_shared/scripts/launch_agent.sh";
const SAFE_HOST = /^[A-Za-z0-9_.@][A-Za-z0-9_.@-]*$/;

/** Environments from the parsed YAML; unnamed entries and hosts without a safe name or absolute vault are skipped. */
export function parseEnvironments(data: unknown): Environment[] {
	const entries = (data as { environments?: unknown } | null)?.environments;
	if (!Array.isArray(entries)) return [];
	return entries.flatMap((entry: Record<string, unknown>) => {
		const name = typeof entry?.name === "string" ? entry.name : undefined;
		if (!name) return [];
		const icon = typeof entry.icon === "string" ? { icon: entry.icon } : {};
		if (entry.host === undefined) return [{ name, ...icon }];
		const { host, vault } = entry;
		if (typeof host !== "string" || !SAFE_HOST.test(host) || typeof vault !== "string" || !vault.startsWith("/")) return [];
		return [{ name, host, vault: vault.replace(/\/+$/, ""), ...icon }];
	});
}

export function defaultEnvironment(environments: Environment[]): Environment {
	return environments[0] ?? LOCAL_ENVIRONMENT;
}

/** Command running the local launch_agent.sh with args; a remote host and its vault go to the script, with vault paths re-rooted. */
export function launchArgv(environment: Environment, vaultRoot: string, args: string[]): string[] {
	const script = `${vaultRoot}/${LAUNCH_SCRIPT}`;
	const { host, vault } = environment;
	if (!host || !vault) return [script, ...args];
	const rerooted = args.map((arg) => arg.split(`${vaultRoot}/`).join(`${vault}/`));
	return [script, "--host", host, "--vault", vault, ...rerooted];
}
