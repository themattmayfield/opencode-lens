import { Sandbox } from "@e2b/code-interpreter";
import { BaseSandboxProvider } from "./provider";
import type { SandboxConfig, SandboxInfo } from "../types";
import { config } from "../config";

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
			// Create E2B sandbox with template ID
			const sandbox = await Sandbox.create(config.e2bTemplateId, {
				apiKey: config.e2bApiKey,
				timeoutMs: config.sandbox.timeoutMs,
				metadata: {
					sandboxId: id,
					owner: sandboxConfig.owner,
					repo: sandboxConfig.repo,
					branch,
				},
			});

			console.log(
				`Created E2B sandbox for ${sandboxConfig.owner}/${sandboxConfig.repo}`,
			);

			// Clone the repository
			const repoUrl = `https://github.com/${sandboxConfig.owner}/${sandboxConfig.repo}.git`;
			console.log(`Cloning ${repoUrl}...`);

			const cloneResult = await sandbox.commands.run(
				`git clone --depth 1 --branch ${branch} ${repoUrl} /home/user/repo || git clone --depth 1 ${repoUrl} /home/user/repo`,
			);

			if (cloneResult.exitCode !== 0) {
				throw new Error(`Failed to clone repository: ${cloneResult.stderr}`);
			}

			console.log(`Cloned repository ${repoUrl}`);

			// Check if package.json exists using shell command
			const checkResult = await sandbox.commands.run(
				"test -f /home/user/repo/package.json && echo 'exists' || echo 'missing'",
			);
			const hasPackageJson = checkResult.stdout.trim() === "exists";

			if (hasPackageJson) {
				console.log(
					`Installing dependencies for ${sandboxConfig.owner}/${sandboxConfig.repo}`,
				);
				// Use sudo to run as root where bun is installed
				const installResult = await sandbox.commands.run(
					"cd /home/user/repo && sudo -E /root/.bun/bin/bun install",
				);

				if (installResult.exitCode !== 0) {
					console.warn(
						`Dependency installation had issues: ${installResult.stderr}`,
					);
				}
			}

			// Start OpenCode server in the sandbox
			const port = 4096;
			console.log(`Starting OpenCode server on port ${port}...`);

			// Start opencode serve in background (use sudo to access root's binaries)
			await sandbox.commands.run(
				`cd /home/user/repo && sudo -E /root/.bun/bin/opencode serve --port ${port} --hostname 0.0.0.0`,
				{ background: true },
			);

			// Wait for server to start
			await new Promise((resolve) => setTimeout(resolve, 3000));

			// Get the sandbox URL
			const serverUrl = `https://${sandbox.getHost(port)}`;
			const wsUrl = serverUrl.replace("https://", "wss://");

			info.status = "ready";
			info.serverUrl = serverUrl;
			info.wsUrl = wsUrl;

			console.log(`Sandbox ready at ${serverUrl}`);

			this.sandboxes.set(id, { sandbox, info });

			console.log(`Sandbox ready: ${serverUrl}`);

			// Auto-cleanup on expiration
			setTimeout(() => {
				this.destroy(id).catch(console.error);
			}, config.sandbox.timeoutMs);

			return info;
		} catch (error) {
			info.status = "error";
			info.error = error instanceof Error ? error.message : "Unknown error";
			console.error(`Error creating sandbox:`, error);
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
			await entry.sandbox.kill();
			entry.info.status = "terminated";
			console.log(`Destroyed sandbox ${id}`);
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
