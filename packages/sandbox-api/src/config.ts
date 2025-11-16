export const config = {
	port: parseInt(process.env.PORT || "3001", 10),
	e2bApiKey: process.env.E2B_API_KEY || "",
	e2bTemplateId: process.env.E2B_TEMPLATE_ID || "",
	redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
	nodeEnv: process.env.NODE_ENV || "development",

	sandbox: {
		timeoutMs: parseInt(process.env.SANDBOX_TIMEOUT_MS || "1800000", 10), // 30 minutes
		maxPerIp: parseInt(process.env.MAX_SANDBOXES_PER_IP || "10", 10),
		defaultBranch: "main",
	},
} as const;

export function validateConfig() {
	// E2B credentials are always required (no mock mode)
	if (!config.e2bApiKey || config.e2bApiKey === "your_e2b_api_key_here") {
		throw new Error(
			"E2B_API_KEY is required. Get your API key from https://e2b.dev/dashboard",
		);
	}
	if (!config.e2bTemplateId) {
		throw new Error(
			"E2B_TEMPLATE_ID is required. Run the setup script: ./setup-e2b.sh",
		);
	}
}
