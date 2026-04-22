import type { Accountability } from '@directus/types';
import { type AuthProvider, getAuthProviders } from './authProvider/get-auth-providers.js';

import { verify_token } from './verify-token.js';
import { introspectToken, type IntrospectionResponse } from './introspect-token.js';
import { CacheEnabled, CacheGet, CacheSet } from './cache.js';
import type { Knex } from 'knex';


let authProvidersPromise: Promise<AuthProvider[]> | null = null;

function ensureAuthProviders(): Promise<AuthProvider[]> {
	if (!authProvidersPromise) {
		authProvidersPromise = getAuthProviders();
	}
	return authProvidersPromise;
}


export async function getAccountabilityForToken(
	token: string | null,
	iss: string[] | string | undefined,
	accountability: Accountability | null,
	database: Knex
): Promise<Accountability> {
	if (accountability == null) {
		accountability = {
			user: null,
			role: null,
			admin: false,
			app: false,
		};
	}

	if (token == null || iss == null) {
		return accountability;
	}

	const providers = (await ensureAuthProviders()).filter(
		(provider) => provider.issuer_url && iss.includes(provider.issuer_url)
	);

	if (providers.length === 0) return accountability;
	if (providers.length > 1) return accountability;

	const provider = providers[0];

	try {
		const result = await verify_token(provider, token);
		return buildAccountability(provider, result, accountability, database);
	} catch {
		return accountability;
	}
}


export async function introspectAndGetAccountability(
	token: string,
	accountability: Accountability | null,
	database: Knex
): Promise<Accountability | null> {
	if (accountability == null) {
		accountability = {
			user: null,
			role: null,
			admin: false,
			app: false,
		};
	}

	const providers = await ensureAuthProviders();
	const introspectionProviders = providers.filter((p) => p.introspection_url);

	if (introspectionProviders.length === 0) return null;

	for (const provider of introspectionProviders) {
		try {
			const result = await introspectToken(provider, token);

			if (!result.active) continue;

			return buildAccountability(provider, result, accountability, database);
		} catch {
			continue;
		}
	}

	return null;
}


async function buildAccountability(
	provider: AuthProvider,
	claims: IntrospectionResponse | Record<string, unknown>,
	accountability: Accountability,
	database: Knex
): Promise<Accountability> {
	const sub = claims.sub as string | undefined;

	if (provider.use_database) {
		if (CacheEnabled() && sub) {
			const cached = await CacheGet(sub);
			if (cached) return cached;
		}

		const user = await database
			.select('directus_users.id', 'directus_users.role', 'directus_roles.admin_access', 'directus_roles.app_access')
			.from('directus_users')
			.leftJoin('directus_roles', 'directus_users.role', 'directus_roles.id')
			.where({
				'directus_users.external_identifier': sub,
				'directus_users.provider': provider.name,
			})
			.first();

		if (!user) return accountability;

		accountability.user = user.id;
		accountability.role = user.role;
		accountability.admin = user.admin_access === true || user.admin_access == 1;
		accountability.app = user.app_access === true || user.app_access == 1;

		if (CacheEnabled() && sub) {
			CacheSet(sub, accountability);
		}

		return accountability;
	}

	if (provider.role_key != null && claims[provider.role_key] !== undefined) {
		const roleValue = claims[provider.role_key];
		if (typeof roleValue === 'string') {
			accountability.role = roleValue;
		} else if (Array.isArray(roleValue) && roleValue.length > 0) {
			accountability.role = roleValue[0];
		}
	}

	if (provider.admin_key != null && claims[provider.admin_key] !== undefined) {
		accountability.admin = !!claims[provider.admin_key];
	}
	if (provider.app_key != null && claims[provider.app_key] !== undefined) {
		accountability.app = !!claims[provider.app_key];
	}
	accountability.user = sub ?? null;

	return accountability;
}
