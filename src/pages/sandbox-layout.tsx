import { useParams } from "@solidjs/router";
import { Show, createSignal, onCleanup } from "solid-js";
import { SandboxProvider, useSandbox } from "@/context/sandbox";
import { SDKProvider, useSDK } from "@/context/sdk";
import { SyncProvider } from "@/context/sync";
import { LocalProvider } from "@/context/local";
import { SessionProvider } from "@/context/session";
import { SandboxLoader } from "@/components/sandbox-loader";

export default function SandboxLayout(props: { children?: any }) {
	const params = useParams<{ owner: string; repo: string; branch?: string }>();

	return (
		<SandboxProvider
			owner={params.owner}
			repo={params.repo}
			branch={params.branch}
		>
			<SandboxContent>{props.children}</SandboxContent>
		</SandboxProvider>
	);
}

function SandboxContent(props: { children?: any }) {
	const sandbox = useSandbox();

	return (
		<Show
			when={sandbox.state.status === "ready" && sandbox.state.sandbox}
			fallback={
				<SandboxLoader
					status={sandbox.state.status}
					owner={sandbox.state.sandbox?.owner ?? ""}
					repo={sandbox.state.sandbox?.repo ?? ""}
					error={sandbox.state.error}
					onRetry={sandbox.retry}
				/>
			}
		>
			{(sandboxInfo) => (
				<SDKProvider url={sandboxInfo().serverUrl}>
					<SyncProvider>
						<LocalProvider>
							<SandboxSessionManager>{props.children}</SandboxSessionManager>
						</LocalProvider>
					</SyncProvider>
				</SDKProvider>
			)}
		</Show>
	);
}

function SandboxSessionManager(props: { children?: any }) {
	const sdk = useSDK();
	const [sessionId, setSessionId] = createSignal<string | undefined>(undefined);

	// Listen for session.updated events to track the active session
	// Only set the sessionId once when it's first created
	const unsubscribe = sdk.event.listen((e) => {
		const event = e.details;
		if (event.type === "session.updated") {
			const newId = event.properties.info.id;
			// Only update if we don't have a sessionId yet, or if it actually changed
			if (!sessionId() || sessionId() !== newId) {
				setSessionId(newId);
			}
		}
	});

	onCleanup(() => {
		unsubscribe();
	});

	return (
		<Show when={sessionId() || true} keyed>
			<SessionProvider sessionId={sessionId()}>
				{props.children}
			</SessionProvider>
		</Show>
	);
}
