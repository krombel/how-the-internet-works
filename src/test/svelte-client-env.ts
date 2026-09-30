// A Vitest environment: Node globals, with modules transformed for the browser (as `client`), so Svelte runes compile
// as in the app ($state proxies and all). Tests stub the few browser globals they need.
import type { Environment } from 'vitest/runtime';

export default <Environment>{ name: 'svelte-client', viteEnvironment: 'client', setup: () => ({ teardown() {} }) };
