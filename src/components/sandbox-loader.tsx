import { Show, Switch, Match } from "solid-js";
import { Card, Icon, Button } from "@ui-lib";
import { Spinner } from "./spinner";

interface SandboxLoaderProps {
	status: "initializing" | "ready" | "error";
	owner: string;
	repo: string;
	error?: string;
}

export function SandboxLoader(props: SandboxLoaderProps) {
	const repoName = () => `${props.owner}/${props.repo}`;

	const retry = () => {
		window.location.reload();
	};

	return (
		<div class="size-full flex items-center justify-center bg-background-base">
			<div class="max-w-lg w-full px-6">
				<Switch>
					<Match when={props.status === "initializing"}>
						<Card class="flex flex-col items-center gap-6 p-8">
							<Spinner class="w-8 h-8 text-text-base" />
							<div class="flex flex-col items-center gap-3">
								<h2 class="text-20-medium text-text-strong">
									Initializing Sandbox
								</h2>
								<div class="text-14-regular text-text-base text-center flex flex-col gap-2">
									<div class="flex items-center gap-2 justify-center">
										<Icon name="github" size="small" />
										<span class="font-mono">{repoName()}</span>
									</div>
									<div class="text-text-weak">
										<div>Cloning repository...</div>
										<div class="text-12-regular mt-1">
											This may take 30-60 seconds
										</div>
									</div>
								</div>
							</div>
						</Card>
					</Match>

					<Match when={props.status === "error"}>
						<Card variant="error" class="flex flex-col items-center gap-6 p-8">
							<div class="w-12 h-12 rounded-full bg-surface-critical-base flex items-center justify-center">
								<Icon
									name="warning"
									size="large"
									class="text-icon-critical-base"
								/>
							</div>
							<div class="flex flex-col items-center gap-3">
								<h2 class="text-20-medium text-text-strong">
									Failed to Initialize Sandbox
								</h2>
								<div class="text-14-regular text-text-base text-center">
									<div class="flex items-center gap-2 justify-center mb-3">
										<Icon name="github" size="small" />
										<span class="font-mono">{repoName()}</span>
									</div>
									<Show when={props.error}>
										<div class="text-text-critical-base bg-surface-critical-weak p-3 rounded-md text-left">
											<code class="text-12-regular">{props.error}</code>
										</div>
									</Show>
								</div>
							</div>
							<div class="flex gap-3">
								<Button onClick={retry} variant="primary">
									Retry
								</Button>
								<Button
									onClick={() => (window.location.href = "/")}
									variant="secondary"
								>
									Go Home
								</Button>
							</div>
						</Card>
					</Match>
				</Switch>
			</div>
		</div>
	);
}
