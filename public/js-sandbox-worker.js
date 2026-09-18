self.onmessage = function (e) {
	const { code, options } = e.data;
	const fallbackName = options?.name || "";

	try {
		const frozenOptions = Object.freeze({ ...options });
		const fn = new Function(
			"options",
			"globalThis",
			"self",
			"window",
			"document",
			"navigator",
			"localStorage",
			"sessionStorage",
			"indexedDB",
			"caches",
			"fetch",
			"XMLHttpRequest",
			"WebSocket",
			"EventSource",
			"importScripts",
			"postMessage",
			"close",
			"Function",
			"eval",
			`
				return (() => {
					"use strict";
					${code}
					if (typeof rename === "function") {
						return rename(options);
					}
					return options.name;
				})();
			`,
		);
		const blockedGlobals = new Array(18).fill(undefined);
		const result = fn(frozenOptions, ...blockedGlobals);

		if (typeof result === "string") {
			self.postMessage({ success: true, result });
		} else {
			self.postMessage({
				success: false,
				error: `Expected string return value, got ${typeof result}`,
				result: fallbackName,
			});
		}
	} catch (error) {
		self.postMessage({
			success: false,
			error: error.message || String(error),
			result: fallbackName,
		});
	}
};
