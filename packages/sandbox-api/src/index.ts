import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config, validateConfig } from "./config";
import sandboxRoutes from "./routes/sandbox";

// Validate configuration on startup
validateConfig();

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
	"*",
	cors({
		origin: (origin) => {
			// Allow all origins in development
			if (config.nodeEnv === "development") return origin;
			// Check production domains
			const allowedOrigins = ["https://opencode.ai", "https://app.opencode.ai"];
			const vercelPattern = /https:\/\/.*\.vercel\.app$/;

			if (allowedOrigins.includes(origin) || vercelPattern.test(origin)) {
				return origin;
			}
			return allowedOrigins[0];
		},
		credentials: true,
	}),
);

// Health check
app.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: Date.now(),
		version: "1.0.0",
	});
});

// Routes
app.route("/api/sandbox", sandboxRoutes);

// 404 handler
app.notFound((c) => {
	return c.json({ error: "Not found" }, 404);
});

// Error handler
app.onError((err, c) => {
	console.error("Error:", err);
	return c.json(
		{
			error: err.message || "Internal server error",
		},
		500,
	);
});

// Start server
const port = config.port;
console.log(`🚀 Sandbox API server starting on port ${port}`);
console.log(`📦 Environment: ${config.nodeEnv}`);
console.log(`⏱️  Sandbox timeout: ${config.sandbox.timeoutMs}ms`);

export default {
	port,
	fetch: app.fetch,
};
