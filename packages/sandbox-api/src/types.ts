export interface SandboxConfig {
	owner: string;
	repo: string;
	branch?: string;
}

export interface SandboxInfo {
	id: string;
	owner: string;
	repo: string;
	branch: string;
	status: "initializing" | "ready" | "error" | "terminated";
	createdAt: number;
	expiresAt: number;
	serverUrl: string;
	wsUrl: string;
	error?: string;
}

export interface SandboxProvider {
	create(config: SandboxConfig): Promise<SandboxInfo>;
	get(id: string): Promise<SandboxInfo | null>;
	extend(id: string, ttlMs: number): Promise<SandboxInfo>;
	destroy(id: string): Promise<void>;
	list(): Promise<SandboxInfo[]>;
}

export interface CreateSandboxRequest {
	owner: string;
	repo: string;
	branch?: string;
}

export interface CreateSandboxResponse {
	sandbox: SandboxInfo;
}

export interface ExtendSandboxRequest {
	ttlMs?: number;
}
