import { Sandbox } from "@e2b/code-interpreter";
import { BaseSandboxProvider } from "./provider";
import type { SandboxConfig, SandboxInfo } from "../types";
import { config } from "../config";

interface E2BSandboxMetadata {
	owner: string;
	repo: string;
	branch: string;
	createdAt: number;
	expiresAt: number;
	serverUrl: string;
	wsUrl: string;
}

export class E2BSandboxProvider extends BaseSandboxProvider {
	private sandboxes: Map<string, { sandbox: Sandbox; info: SandboxInfo }> =
		new Map();

	async create(sandboxConfig: SandboxConfig): Promise<SandboxInfo> {
		const id = this.generateId();
		const branch = sandboxConfig.branch || config.sandbox.defaultBranch;
		const expiresAt = this.getExpiresAt(config.sandbox.timeoutMs);

		const info: SandboxInfo = {
			id,
			owner: sandboxConfig.owner,
			repo: sandboxConfig.repo,
			branch,
			status: "initializing",
			createdAt: Date.now(),
			expiresAt,
			serverUrl: "",
			wsUrl: "",
		};

		try {
			// Create E2B sandbox
			const sandbox = await Sandbox.create({
				apiKey: config.e2bApiKey,
				timeoutMs: config.sandbox.timeoutMs,
				metadata: {
					sandboxId: id,
					owner: sandboxConfig.owner,
					repo: sandboxConfig.repo,
					branch,
				} as E2BSandboxMetadata,
			});

			// Clone the repository
			const repoUrl = `https://github.com/${sandboxConfig.owner}/${sandboxConfig.repo}.git`;
			await sandbox.commands.run(
				`git clone --depth 1 --branch ${branch} ${repoUrl} /home/user/repo || git clone --depth 1 ${repoUrl} /home/user/repo`,
			);

			// Install dependencies if needed (detect package.json, etc.)
			const hasPackageJson = await sandbox.filesystem.exists(
				"/home/user/repo/package.json",
			);
			if (hasPackageJson) {
				console.log(
					`Installing dependencies for ${sandboxConfig.owner}/${sandboxConfig.repo}`,
				);
				await sandbox.commands.run("cd /home/user/repo && bun install");
			}

			// Start OpenCode server (assuming it's pre-installed in the E2B template)
			// For now, we'll expose a placeholder URL - you'll need to configure E2B template
			const port = 4096;
			const serverProcess = await sandbox.commands.run(
				`cd /home/user/repo && opencode serve --port ${port} --host 0.0.0.0`,
				{ background: true },
			);

			// Get the sandbox URL (E2B provides this)
			const serverUrl = `https://${sandbox.getHost(port)}`;
			const wsUrl = serverUrl.replace("https://", "wss://");

			info.status = "ready";
			info.serverUrl = serverUrl;
			info.wsUrl = wsUrl;

			this.sandboxes.set(id, { sandbox, info });

			// Auto-cleanup on expiration
			setTimeout(() => {
				this.destroy(id).catch(console.error);
			}, config.sandbox.timeoutMs);

			return info;
		} catch (error) {
			info.status = "error";
			info.error = error instanceof Error ? error.message : "Unknown error";
			throw error;
		}
	}

	async get(id: string): Promise<SandboxInfo | null> {
		const entry = this.sandboxes.get(id);
		return entry ? entry.info : null;
	}

	async extend(id: string, ttlMs: number): Promise<SandboxInfo> {
		const entry = this.sandboxes.get(id);
		if (!entry) {
			throw new Error(`Sandbox ${id} not found`);
		}

		const newExpiresAt = this.getExpiresAt(ttlMs);
		entry.info.expiresAt = newExpiresAt;

		return entry.info;
	}

	async destroy(id: string): Promise<void> {
		const entry = this.sandboxes.get(id);
		if (!entry) return;

		try {
			await entry.sandbox.close();
			entry.info.status = "terminated";
		} catch (error) {
			console.error(`Error destroying sandbox ${id}:`, error);
		} finally {
			this.sandboxes.delete(id);
		}
	}

	async list(): Promise<SandboxInfo[]> {
		return Array.from(this.sandboxes.values()).map((entry) => entry.info);
	}
}
