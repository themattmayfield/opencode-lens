import type { SandboxConfig, SandboxInfo, SandboxProvider } from "../types";

export abstract class BaseSandboxProvider implements SandboxProvider {
	abstract create(config: SandboxConfig): Promise<SandboxInfo>;
	abstract get(id: string): Promise<SandboxInfo | null>;
	abstract extend(id: string, ttlMs: number): Promise<SandboxInfo>;
	abstract destroy(id: string): Promise<void>;
	abstract list(): Promise<SandboxInfo[]>;

	protected generateId(): string {
		return `sb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	protected getExpiresAt(ttlMs: number): number {
		return Date.now() + ttlMs;
	}
}
