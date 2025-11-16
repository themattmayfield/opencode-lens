import { createOpencodeClient, type Event } from "@opencode-ai/sdk/client";
import { createSimpleContext } from "./helper";
import { createGlobalEmitter } from "@solid-primitives/event-bus";
import { onCleanup } from "solid-js";

export const { use: useSDK, provider: SDKProvider } = createSimpleContext({
	name: "SDK",
	init: (props: { url: string | (() => string) }) => {
		const abort = new AbortController();

		// Support both static and dynamic URLs
		const getUrl = () =>
			typeof props.url === "function" ? props.url() : props.url;

		const sdk = createOpencodeClient({
			baseUrl: getUrl(),
			signal: abort.signal,
		});

		const emitter =
			createGlobalEmitter<{
				[key in Event["type"]]: Extract<Event, { type: key }>;
			}>();

		sdk.event.subscribe().then(async (events) => {
			for await (const event of events.stream) {
				console.log("event", event.type);
				emitter.emit(event.type, event);
			}
		});

		onCleanup(() => {
			abort.abort();
		});

		return { client: sdk, event: emitter };
	},
});
