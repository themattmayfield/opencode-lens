import { BaseSandboxProvider } from "./provider";
import type { SandboxConfig, SandboxInfo } from "../types";
import { config } from "../config";

/**
 * Mock sandbox provider for development/testing without E2B
 * Simulates sandbox creation and returns a mock URL
 */
export class MockSandboxProvider extends BaseSandboxProvider {
	private sandboxes: Map<string, SandboxInfo> = new Map();

	async create(sandboxConfig: SandboxConfig): Promise<SandboxInfo> {
		const id = this.generateId();
		const branch = sandboxConfig.branch || config.sandbox.defaultBranch;
		const expiresAt = this.getExpiresAt(config.sandbox.timeoutMs);

		console.log(
			`[MOCK] Creating sandbox for ${sandboxConfig.owner}/${sandboxConfig.repo}`,
		);

		// Simulate async creation
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const info: SandboxInfo = {
			id,
			owner: sandboxConfig.owner,
			repo: sandboxConfig.repo,
			branch,
			status: "ready",
			createdAt: Date.now(),
			expiresAt,
			// In mock mode, point to local OpenCode server
			serverUrl: "http://127.0.0.1:4096",
			wsUrl: "ws://127.0.0.1:4096",
		};

		this.sandboxes.set(id, info);

		// Auto-cleanup
		setTimeout(() => {
			this.destroy(id).catch(console.error);
		}, config.sandbox.timeoutMs);

		console.log(`[MOCK] Sandbox ${id} created (mock URL: ${info.serverUrl})`);
		console.log(
			`[MOCK] Note: This points to your local OpenCode server. Make sure it's running with the repo already open.`,
		);

		return info;
	}

	async get(id: string): Promise<SandboxInfo | null> {
		return this.sandboxes.get(id) ?? null;
	}

	async extend(id: string, ttlMs: number): Promise<SandboxInfo> {
		const info = this.sandboxes.get(id);
		if (!info) {
			throw new Error(`Sandbox ${id} not found`);
		}

		const newExpiresAt = this.getExpiresAt(ttlMs);
		info.expiresAt = newExpiresAt;

		console.log(`[MOCK] Extended sandbox ${id} TTL`);
		return info;
	}

	async destroy(id: string): Promise<void> {
		const info = this.sandboxes.get(id);
		if (!info) return;

		info.status = "terminated";
		this.sandboxes.delete(id);
		console.log(`[MOCK] Destroyed sandbox ${id}`);
	}

	async list(): Promise<SandboxInfo[]> {
		return Array.from(this.sandboxes.values());
	}
}
