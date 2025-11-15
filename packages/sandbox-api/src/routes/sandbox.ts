import { Hono } from "hono";
import { getSandboxManager } from "../sandbox/manager";
import type {
	CreateSandboxRequest,
	CreateSandboxResponse,
	ExtendSandboxRequest,
} from "../types";

const app = new Hono();
const manager = getSandboxManager();

// Rate limiting state (in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
	ip: string,
	maxRequests: number,
	windowMs: number,
): boolean {
	const now = Date.now();
	const record = rateLimitMap.get(ip);

	if (!record || now > record.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
		return true;
	}

	if (record.count >= maxRequests) {
		return false;
	}

	record.count++;
	return true;
}

// Create sandbox
app.post("/", async (c) => {
	const ip =
		c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

	// Rate limiting: 10 requests per hour per IP
	if (!checkRateLimit(ip, 10, 60 * 60 * 1000)) {
		return c.json(
			{ error: "Rate limit exceeded. Please try again later." },
			429,
		);
	}

	const body = await c.req.json<CreateSandboxRequest>();

	if (!body.owner || !body.repo) {
		return c.json({ error: "owner and repo are required" }, 400);
	}

	// Validate GitHub repo format
	const repoRegex = /^[a-zA-Z0-9_-]+$/;
	if (!repoRegex.test(body.owner) || !repoRegex.test(body.repo)) {
		return c.json({ error: "Invalid owner or repo name" }, 400);
	}

	try {
		const sandbox = await manager.create({
			owner: body.owner,
			repo: body.repo,
			branch: body.branch,
		});

		const response: CreateSandboxResponse = { sandbox };
		return c.json(response, 201);
	} catch (error) {
		console.error("Error creating sandbox:", error);
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to create sandbox",
			},
			500,
		);
	}
});

// Get sandbox status
app.get("/:id", async (c) => {
	const id = c.req.param("id");
	const sandbox = await manager.get(id);

	if (!sandbox) {
		return c.json({ error: "Sandbox not found" }, 404);
	}

	return c.json({ sandbox });
});

// Extend sandbox TTL
app.post("/:id/extend", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json<ExtendSandboxRequest>();

	try {
		const ttlMs = body.ttlMs || 30 * 60 * 1000; // Default 30 minutes
		const maxTtl = 60 * 60 * 1000; // Max 1 hour

		if (ttlMs > maxTtl) {
			return c.json({ error: `TTL cannot exceed ${maxTtl}ms` }, 400);
		}

		const sandbox = await manager.extend(id, ttlMs);
		return c.json({ sandbox });
	} catch (error) {
		console.error("Error extending sandbox:", error);
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to extend sandbox",
			},
			500,
		);
	}
});

// Destroy sandbox
app.delete("/:id", async (c) => {
	const id = c.req.param("id");

	try {
		await manager.destroy(id);
		return c.json({ success: true });
	} catch (error) {
		console.error("Error destroying sandbox:", error);
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to destroy sandbox",
			},
			500,
		);
	}
});

// List all sandboxes (admin only in production)
app.get("/", async (c) => {
	const sandboxes = await manager.list();
	return c.json({ sandboxes });
});

export default app;
