// Launch environments from vault/agents/_shared/ENVIRONMENTS.yml: this machine, or an ssh host with its own vault clone.

export interface Environment {
	name: string;
	/** ssh target; unset for this machine. */
	host?: string;
	/** Absolute vault path on the host. */
	vault?: string;
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
		if (entry.host === undefined) return [{ name }];
		const { host, vault } = entry;
		if (typeof host !== "string" || !SAFE_HOST.test(host) || typeof vault !== "string" || !vault.startsWith("/")) return [];
		return [{ name, host, vault: vault.replace(/\/+$/, "") }];
	});
}

export function defaultEnvironment(environments: Environment[]): Environment {
	return environments[0] ?? LOCAL_ENVIRONMENT;
}

/** Single-quotes a value for a POSIX shell. */
export function shellQuote(value: string): string {
	return `'${value.split("'").join(`'\\''`)}'`;
}

/** Command running launch_agent.sh with args: directly here, or over ssh after pulling the host's vault, with vault paths re-rooted. */
export function launchArgv(environment: Environment, vaultRoot: string, args: string[]): string[] {
	const { host, vault } = environment;
	if (!host || !vault) return [`${vaultRoot}/${LAUNCH_SCRIPT}`, ...args];
	const rerooted = args.map((arg) => arg.split(`${vaultRoot}/`).join(`${vault}/`));
	const pull = `git -C ${shellQuote(vault)} pull -q --no-rebase --no-edit || echo "warning: git pull failed in ${vault} on ${host}"`;
	const launch = [`${vault}/${LAUNCH_SCRIPT}`, ...rerooted].map(shellQuote).join(" ");
	return ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", host, `${pull}; ${launch}`];
}
