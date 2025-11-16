import type { SandboxProvider } from "../types";
import { E2BSandboxProvider } from "./e2b";
import { config } from "../config";

let instance: SandboxProvider | null = null;

export function getSandboxManager(): SandboxProvider {
	if (!instance) {
		// Validate E2B configuration
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

		console.log("✅ Using E2B sandbox provider");
		console.log(`   Template: ${config.e2bTemplateId}`);
		instance = new E2BSandboxProvider();
	}
	return instance;
}
