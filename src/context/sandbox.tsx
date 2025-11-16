import { createStore } from "solid-js/store";
import { onCleanup, createEffect } from "solid-js";
import { createSimpleContext } from "./helper";

interface SandboxInfo {
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

interface SandboxState {
	status: "initializing" | "ready" | "error";
	sandbox?: SandboxInfo;
	error?: string;
}

export const { use: useSandbox, provider: SandboxProvider } =
	createSimpleContext({
		name: "Sandbox",
		init: (props: { owner: string; repo: string; branch?: string }) => {
			const [state, setState] = createStore<SandboxState>({
				status: "initializing",
			});

			const sandboxApiUrl =
				import.meta.env.VITE_SANDBOX_API_URL || "http://localhost:3001";

			// Create sandbox on mount
			const createSandbox = async () => {
				try {
					setState("status", "initializing");

					const response = await fetch(`${sandboxApiUrl}/api/sandbox`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							owner: props.owner,
							repo: props.repo,
							branch: props.branch,
						}),
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || "Failed to create sandbox");
					}

					const data = await response.json();
					setState({
						status: "ready",
						sandbox: data.sandbox,
					});
				} catch (error) {
					console.error("Failed to create sandbox:", error);
					setState({
						status: "error",
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			};

			// Extend sandbox TTL
			const extend = async (ttlMs = 30 * 60 * 1000) => {
				if (!state.sandbox) return;

				try {
					const response = await fetch(
						`${sandboxApiUrl}/api/sandbox/${state.sandbox.id}/extend`,
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({ ttlMs }),
						},
					);

					if (!response.ok) {
						throw new Error("Failed to extend sandbox");
					}

					const data = await response.json();
					setState("sandbox", data.sandbox);
				} catch (error) {
					console.error("Failed to extend sandbox:", error);
				}
			};

			// Destroy sandbox
			const destroy = async () => {
				if (!state.sandbox) return;

				try {
					await fetch(`${sandboxApiUrl}/api/sandbox/${state.sandbox.id}`, {
						method: "DELETE",
					});
					setState("sandbox", "status", "terminated");
				} catch (error) {
					console.error("Failed to destroy sandbox:", error);
				}
			};

			// Retry sandbox creation after failure
			const retry = () => {
				console.log("Retrying sandbox creation...");
				createSandbox();
			};

			// Auto-extend 5 minutes before expiration
			createEffect(() => {
				if (!state.sandbox || state.sandbox.status !== "ready") return;

				const timeUntilExpiry = state.sandbox.expiresAt - Date.now();
				const extendAt = timeUntilExpiry - 5 * 60 * 1000; // 5 minutes before

				if (extendAt > 0) {
					const timer = setTimeout(() => {
						extend();
					}, extendAt);

					onCleanup(() => clearTimeout(timer));
				}
			});

			// Cleanup on unmount
			onCleanup(() => {
				destroy();
			});

			// Initialize
			createSandbox();

			return {
				get state() {
					return state;
				},
				extend,
				destroy,
				retry,
			};
		},
	});
