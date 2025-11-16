import "solid-js";

declare module "solid-js" {
	namespace JSX {
		interface Directives {
			sortable: boolean;
		}
		interface CustomAttributes<T> {
			"use:sortable"?: boolean;
		}
	}
}

// This is required to make the file a module
export {};
