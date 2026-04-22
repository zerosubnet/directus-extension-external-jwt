import type { AuthProvider } from './authProvider/get-auth-providers.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface IntrospectionResponse {
	active: boolean;
	sub?: string;
	scope?: string;
	client_id?: string;
	username?: string;
	exp?: number;
	iss?: string;
	aud?: string | string[];
	[key: string]: unknown;
}

export async function introspectToken(
	provider: AuthProvider,
	token: string
): Promise<IntrospectionResponse> {
	if (!provider.introspection_url) {
		throw new Error('No introspection URL configured for provider');
	}

	const body = new URLSearchParams({ token });
	const headers: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded',
		'Accept': 'application/json',
	};

	if (provider.introspection_auth_method === 'jwt') {
		const assertion = createClientAssertion(provider);
		body.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
		body.append('client_assertion', assertion);
	} else {
		// Basic auth (default)
		const credentials = Buffer.from(
			`${provider.client_id}:${provider.client_secret || ''}`
		).toString('base64');
		headers['Authorization'] = `Basic ${credentials}`;
	}

	const response = await fetch(provider.introspection_url, {
		method: 'POST',
		headers,
		body: body.toString(),
	});

	if (!response.ok) {
		throw new Error(`Introspection endpoint returned ${response.status}: ${response.statusText}`);
	}

	return await response.json() as IntrospectionResponse;
}

function decodeBase64(value: string): string {
	try {
		const decoded = Buffer.from(value, 'base64').toString('utf-8');
		// Verify it was actually valid base64 by checking round-trip
		if (Buffer.from(decoded, 'utf-8').toString('base64').replace(/=+$/, '') === value.replace(/=+$/, '')) {
			return decoded;
		}
	} catch {
		// Not base64
	}
	return value;
}

function resolveKeyMaterial(provider: AuthProvider): string {
	const raw = provider.introspection_key ?? provider.client_secret;
	if (!raw) {
		throw new Error('introspection_key or client_secret is required for JWT introspection auth');
	}
	return decodeBase64(raw);
}

function createClientAssertion(provider: AuthProvider): string {
	let privateKey: string;
	let keyId: string | undefined;

	const keyMaterial = resolveKeyMaterial(provider);

	try {
		const keyFile = JSON.parse(keyMaterial);
		// Zitadel format: { type, keyId, key, appId, clientId }
		privateKey = keyFile.key;
		keyId = keyFile.keyId;
	} catch {
		// Not JSON, treat as raw PEM key
		privateKey = keyMaterial;
	}

	const now = Math.floor(Date.now() / 1000);
	const payload = {
		iss: provider.client_id,
		sub: provider.client_id,
		aud: provider.introspection_url,
		iat: now,
		exp: now + 300,
		jti: crypto.randomUUID(),
	};

	return jwt.sign(payload, privateKey, {
		algorithm: 'RS256',
		...(keyId ? { keyid: keyId } : {}),
	});
}
