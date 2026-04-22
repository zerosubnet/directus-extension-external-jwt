import { toArray } from '@directus/utils';
import { JwksClient } from 'jwks-rsa';

import env from '../config/config';
import { createError } from '@directus/errors';

const InvalidJWKIssuerMetadata = createError('INVALID_JWKS_ISSUER_ERROR', 'No JWKS_URL or JWKS_KEYS and could not discover JWKS_URL from openid metadata', 500);
const InvalidJWKSUrl = createError('INVALID_JWKS_ISSUER_ERROR', 'Could not retrieve any valid keys from JWKS_URL', 500);
const InvalidJWKKeys = createError('INVALID_JWKS_ISSUER_ERROR', 'No signing keys in response from provider')


export interface AuthProvider {
	label: string;
	name: string;
	driver: string;
	icon?: string;
	client_id: string;
	client_secret?: string;
	trusted: boolean;
	jwks_url?: string;
	jwks_keys?: string;
	issuer_url?: string;

	admin_key?: string;
	app_key?: string;
	role_key?: string;
	JWKSClient?: JwksClient;
	use_database?: boolean;

	introspection_url?: string;
	introspection_auth_method?: 'basic' | 'jwt';
	introspection_key?: string;
}


export async function getAuthProviders(): Promise<AuthProvider[]> {
	const allProviders: AuthProvider[] = toArray(env['AUTH_PROVIDERS'])
		.filter((provider) => provider && ['openid', 'oauth2'].includes(env[`AUTH_${provider.toUpperCase()}_DRIVER`]))
		.map((provider) => ({
			name: provider,
			label: env[`AUTH_${provider.toUpperCase()}_LABEL`],
			driver: env[`AUTH_${provider.toUpperCase()}_DRIVER`],
			icon: env[`AUTH_${provider.toUpperCase()}_ICON`],
			trusted: env[`AUTH_${provider.toUpperCase()}_TRUSTED`],
			jwks_url: env[`AUTH_${provider.toUpperCase()}_JWKS_URL`],
			jwks_keys: env[`AUTH_${provider.toUpperCase()}_JWKS_KEYS`],
			issuer_url: env[`AUTH_${provider.toUpperCase()}_ISSUER_URL`],
			admin_key: env[`AUTH_${provider.toUpperCase()}_JWT_ADMIN_KEY`],
			app_key: env[`AUTH_${provider.toUpperCase()}_JWT_APP_KEY`],
			role_key: env[`AUTH_${provider.toUpperCase()}_JWT_ROLE_KEY`],
			client_id: env[`AUTH_${provider.toUpperCase()}_CLIENT_ID`],
			client_secret: env[`AUTH_${provider.toUpperCase()}_CLIENT_SECRET`],
			use_database: env[`AUTH_${provider.toUpperCase()}_JWT_USEDB`],
			introspection_url: env[`AUTH_${provider.toUpperCase()}_INTROSPECTION_URL`],
			introspection_auth_method: env[`AUTH_${provider.toUpperCase()}_INTROSPECTION_AUTH_METHOD`] || 'basic',
			introspection_key: env[`AUTH_${provider.toUpperCase()}_INTROSPECTION_KEY`],
		}))
		.filter((provider) => provider.trusted);

	if (allProviders.length === 0) return [];

	const jwksPromises = allProviders
		.filter((p) => p.issuer_url || p.jwks_url || p.jwks_keys)
		.map((p) => getJWKS(p));

	await Promise.all(jwksPromises);

	return allProviders;
}

async function getJWKS(provider: AuthProvider) {
	if (provider.jwks_keys !== undefined && provider.issuer_url == null && provider.jwks_url == null) {
		const jwks_keys = JSON.parse(provider.jwks_keys);
		const jwksClient = new JwksClient({
			getKeysInterceptor: () => {
				return jwks_keys;
			},
			jwksUri: ''
		});

		provider.JWKSClient = jwksClient;
		return provider;
	}

	if (provider.issuer_url && !provider.jwks_url) {
		const discoveryUrl = `${provider.issuer_url.replace(/\/$/, '')}/.well-known/openid-configuration`;
		const response = await fetch(discoveryUrl);
		if (!response.ok) {
			throw new InvalidJWKIssuerMetadata();
		}
		const metadata = await response.json() as { jwks_uri?: string };
		if (metadata.jwks_uri) {
			provider.jwks_url = metadata.jwks_uri;
		}
	}

	if (provider.jwks_url == null) throw new InvalidJWKIssuerMetadata();

	const jwksClient = await getJWKSClient(provider.jwks_url);

	provider.JWKSClient = jwksClient;

	return provider;
}

async function getJWKSClient(url: string) {
	const jwksClient = new JwksClient({
		jwksUri: url,
		cache: true,
		cacheMaxAge: 36000000, // 10 hours
		cacheMaxEntries: 10,
		timeout: 30000, // 30 seconds
	});

	try {
		const keys = await jwksClient.getSigningKeys()
		if (keys.length == 0) {
			throw new InvalidJWKKeys();
		}
	} catch {
		throw new InvalidJWKSUrl();
	}

	return jwksClient;
}
