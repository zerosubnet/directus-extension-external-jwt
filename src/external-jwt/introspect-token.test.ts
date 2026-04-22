import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { introspectToken } from './introspect-token'
import type { AuthProvider } from './authProvider/get-auth-providers'
import * as crypto from 'crypto'
import jwt from 'jsonwebtoken'

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
	modulusLength: 2048,
	publicKeyEncoding: { type: 'spki', format: 'pem' },
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

describe('introspectToken', () => {
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		vi.stubGlobal('fetch', mockFetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should throw if no introspection URL is configured', async () => {
		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'test-client',
			trusted: true,
		};

		await expect(introspectToken(provider, 'some-token')).rejects.toThrow(
			'No introspection URL configured'
		);
	});

	it('should call introspection endpoint with basic auth', async () => {
		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'my-client',
			client_secret: 'my-secret',
			trusted: true,
			introspection_url: 'https://auth.example.com/introspect',
			introspection_auth_method: 'basic',
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ active: true, sub: 'user123', scope: 'openid profile' }),
		});

		const result = await introspectToken(provider, 'opaque-token-abc');

		expect(result.active).toBe(true);
		expect(result.sub).toBe('user123');

		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toBe('https://auth.example.com/introspect');
		expect(options.method).toBe('POST');

		const expectedAuth = Buffer.from('my-client:my-secret').toString('base64');
		expect(options.headers['Authorization']).toBe(`Basic ${expectedAuth}`);
		expect(options.body).toContain('token=opaque-token-abc');
	});

	it('should call introspection endpoint with JWT auth using raw PEM key', async () => {
		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'my-api-client',
			client_secret: privateKey,
			trusted: true,
			introspection_url: 'https://auth.example.com/introspect',
			introspection_auth_method: 'jwt',
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ active: true, sub: 'user456' }),
		});

		const result = await introspectToken(provider, 'opaque-token-xyz');

		expect(result.active).toBe(true);
		expect(result.sub).toBe('user456');

		const [, options] = mockFetch.mock.calls[0];
		expect(options.headers['Authorization']).toBeUndefined();

		const bodyParams = new URLSearchParams(options.body);
		expect(bodyParams.get('token')).toBe('opaque-token-xyz');
		expect(bodyParams.get('client_assertion_type')).toBe(
			'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
		);

		const assertion = bodyParams.get('client_assertion')!;
		const decoded = jwt.verify(assertion, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
		expect(decoded.iss).toBe('my-api-client');
		expect(decoded.sub).toBe('my-api-client');
		expect(decoded.aud).toBe('https://auth.example.com/introspect');
	});

	it('should call introspection endpoint with JWT auth using Zitadel JSON key', async () => {
		const zitadelKey = JSON.stringify({
			type: 'application',
			keyId: 'test-key-123',
			key: privateKey,
			appId: 'app-456',
			clientId: 'my-api-client',
		});

		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'my-api-client',
			client_secret: zitadelKey,
			trusted: true,
			introspection_url: 'https://zitadel.example.com/oauth/v2/introspect',
			introspection_auth_method: 'jwt',
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ active: true, sub: 'user789' }),
		});

		const result = await introspectToken(provider, 'some-token');

		expect(result.active).toBe(true);

		const [, options] = mockFetch.mock.calls[0];
		const bodyParams = new URLSearchParams(options.body);
		const assertion = bodyParams.get('client_assertion')!;
		const header = jwt.decode(assertion, { complete: true })?.header;
		expect(header?.kid).toBe('test-key-123');
	});

	it('should return inactive response as-is', async () => {
		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'my-client',
			client_secret: 'my-secret',
			trusted: true,
			introspection_url: 'https://auth.example.com/introspect',
			introspection_auth_method: 'basic',
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ active: false }),
		});

		const result = await introspectToken(provider, 'expired-token');
		expect(result.active).toBe(false);
		expect(result.sub).toBeUndefined();
	});

	it('should throw on HTTP error response', async () => {
		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'my-client',
			client_secret: 'bad-secret',
			trusted: true,
			introspection_url: 'https://auth.example.com/introspect',
			introspection_auth_method: 'basic',
		};

		mockFetch.mockResolvedValue({
			ok: false,
			status: 401,
			statusText: 'Unauthorized',
		});

		await expect(introspectToken(provider, 'some-token')).rejects.toThrow(
			'Introspection endpoint returned 401: Unauthorized'
		);
	});

	it('should throw if JWT auth is used without key or client_secret', async () => {
		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'my-client',
			trusted: true,
			introspection_url: 'https://auth.example.com/introspect',
			introspection_auth_method: 'jwt',
		};

		await expect(introspectToken(provider, 'some-token')).rejects.toThrow(
			'introspection_key or client_secret is required'
		);
	});

	it('should prefer introspection_key over client_secret', async () => {
		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'my-api-client',
			client_secret: 'should-not-be-used',
			introspection_key: privateKey,
			trusted: true,
			introspection_url: 'https://auth.example.com/introspect',
			introspection_auth_method: 'jwt',
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ active: true, sub: 'user123' }),
		});

		const result = await introspectToken(provider, 'some-token');
		expect(result.active).toBe(true);

		const [, options] = mockFetch.mock.calls[0];
		const bodyParams = new URLSearchParams(options.body);
		const assertion = bodyParams.get('client_assertion')!;
		const decoded = jwt.verify(assertion, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
		expect(decoded.iss).toBe('my-api-client');
	});

	it('should decode base64-encoded introspection_key', async () => {
		const zitadelKey = JSON.stringify({
			type: 'application',
			keyId: 'b64-key-id',
			key: privateKey,
			appId: 'app-789',
			clientId: 'my-api-client',
		});
		const base64Key = Buffer.from(zitadelKey, 'utf-8').toString('base64');

		const provider: AuthProvider = {
			label: 'test',
			name: 'test',
			driver: 'openid',
			client_id: 'my-api-client',
			introspection_key: base64Key,
			trusted: true,
			introspection_url: 'https://auth.example.com/introspect',
			introspection_auth_method: 'jwt',
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ active: true, sub: 'user999' }),
		});

		const result = await introspectToken(provider, 'some-token');
		expect(result.active).toBe(true);

		const [, options] = mockFetch.mock.calls[0];
		const bodyParams = new URLSearchParams(options.body);
		const assertion = bodyParams.get('client_assertion')!;
		const header = jwt.decode(assertion, { complete: true })?.header;
		expect(header?.kid).toBe('b64-key-id');

		const decoded = jwt.verify(assertion, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
		expect(decoded.iss).toBe('my-api-client');
	});
});
