export const config = {
	port: parseInt(process.env.PORT || "3001", 10),
	e2bApiKey: process.env.E2B_API_KEY || "",
	redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
	nodeEnv: process.env.NODE_ENV || "development",

	sandbox: {
		timeoutMs: parseInt(process.env.SANDBOX_TIMEOUT_MS || "1800000", 10), // 30 minutes
		maxPerIp: parseInt(process.env.MAX_SANDBOXES_PER_IP || "10", 10),
		defaultBranch: "main",
	},
} as const;

export function validateConfig() {
	if (!config.e2bApiKey && config.nodeEnv === "production") {
		throw new Error("E2B_API_KEY is required in production");
	}
}
