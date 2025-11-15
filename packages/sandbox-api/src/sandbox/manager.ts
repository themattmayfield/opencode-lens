import type { SandboxProvider } from "../types";
import { E2BSandboxProvider } from "./e2b";
import { MockSandboxProvider } from "./mock";
import { config } from "../config";

let instance: SandboxProvider | null = null;

export function getSandboxManager(): SandboxProvider {
	if (!instance) {
		// Use mock provider if no E2B API key is set
		if (!config.e2bApiKey || config.e2bApiKey === "your_e2b_api_key_here") {
			console.log("⚠️  No E2B API key configured, using MOCK sandbox provider");
			console.log("💡 Set E2B_API_KEY in .env to use real E2B sandboxes");
			instance = new MockSandboxProvider();
		} else {
			console.log("✅ Using E2B sandbox provider");
			instance = new E2BSandboxProvider();
		}
	}
	return instance;
}
