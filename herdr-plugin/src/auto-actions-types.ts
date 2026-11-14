// The auto actions panel's requests and reply, free of Node so the Herdr app's sidebar can share them.

export interface AutoAction {
	name: string;
	enabled: boolean;
	/** A launcher's label, with or without its emoji. */
	launcher: string;
	environment?: string;
	profile?: string;
}

export interface AutoActionsPanel {
	/** The environment shown is the default when unset; an unset profile is the launcher's. */
	actions: Array<Omit<AutoAction, "environment"> & { environment: string; launcherLabel?: string; launcherProfile?: string; error?: string }>;
	profiles: string[];
	environments: Array<{ name: string; icon?: string }>;
}

/** Null unsets the profile or environment. */
export interface AutoActionChange {
	name: string;
	enabled?: boolean;
	environment?: string | null;
	profile?: string | null;
}
