/* @refresh reload */
import "@/index.css";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { MetaProvider } from "@solidjs/meta";
import { Fonts, MarkedProvider } from "@ui-lib";
import { SDKProvider } from "./context/sdk";
import { SyncProvider } from "./context/sync";
import { LocalProvider } from "./context/local";
import Layout from "@/pages/layout";
import SessionLayout from "@/pages/session-layout";
import Session from "@/pages/session";
import SandboxLayout from "@/pages/sandbox-layout";
import SandboxSession from "@/pages/sandbox-session";

const host = import.meta.env.VITE_OPENCODE_SERVER_HOST ?? "127.0.0.1";
const port = import.meta.env.VITE_OPENCODE_SERVER_PORT ?? "4096";

const url =
	new URLSearchParams(document.location.search).get("url") ||
	(location.hostname.includes("opencode.ai") ||
	location.hostname.includes("localhost")
		? `http://${host}:${port}`
		: "/");

console.log("🔌 OpenCode Desktop connecting to:", url);

const root = document.getElementById("root");
if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

render(
	() => (
		<MarkedProvider>
			<SDKProvider url={url}>
				<SyncProvider>
					<LocalProvider>
						<MetaProvider>
							<Fonts />
							<Router root={Layout}>
								<Route path={["/", "/session"]} component={SessionLayout}>
									<Route path="/:id?" component={Session} />
								</Route>
								<Route path="/:owner/:repo" component={SandboxLayout}>
									<Route path="/:branch?" component={SandboxSession} />
								</Route>
							</Router>
						</MetaProvider>
					</LocalProvider>
				</SyncProvider>
			</SDKProvider>
		</MarkedProvider>
	),
	root!,
);
