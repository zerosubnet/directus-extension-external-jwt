import { describe, expect, it, vi } from 'vitest'

vi.mock('@directus/extensions-sdk', () => ({
	defineHook: (fn: (...args: unknown[]) => unknown) => fn,
}));

import { default as index } from './index'

describe('index', () => {
	it('should export a function', () => {
		expect(index).to.be.instanceOf(Function);
	})
})
