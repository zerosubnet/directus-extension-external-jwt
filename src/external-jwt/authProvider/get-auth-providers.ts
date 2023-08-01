import { toArray } from '@directus/utils';
import {JwksClient} from 'jwks-rsa';

import { Issuer } from 'openid-client';

import env from '../config/config.js';
import { createError } from '@directus/errors';

const InvalidJWKIssuerMetadata = createError('INVALID_JWKS_ISSUER_ERROR', 'No JWKS_URL or JWKS_KEYS and could not discover JWKS_URL from openid metadata', 500);
const InvalidJWKSUrl = createError('INVALID_JWKS_ISSUER_ERROR', 'Could not retrieve any valid keys from JWKS_URL', 500);


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
}



export async function getAuthProviders(): Promise<AuthProvider[]> {
	console.log("calling auth providers")
	return new Promise((resolve, reject) => {
		const authProviders: AuthProvider[] = toArray(env['AUTH_PROVIDERS'])
			.filter((provider) => provider && env[`AUTH_${provider.toUpperCase()}_DRIVER`] === ('openid' || 'oauth2'))
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
			}));

		
		if(authProviders.length === 0) return resolve([]);

		

		const promises = [];

		for (const authProvider of authProviders) {
			switch (authProvider.driver) {	
				case 'openid':
					
					if (!authProvider.trusted || (authProvider.issuer_url == null && authProvider.jwks_url == null && authProvider.jwks_keys == null)) break;
					//promises.push(getJWKS(authProvider.issuer_url, authProvider.jwks_url, authProvider.jwks_keys));
					promises.push(getJWKS(authProvider));
					break;
				case 'oauth2':
					if (!authProvider.trusted || (authProvider.issuer_url == null && authProvider.jwks_url == null && authProvider.jwks_keys == null)) break;
					//promises.push(getJWKS(authProvider.issuer_url, authProvider.jwks_url, authProvider.jwks_keys));
					promises.push(getJWKS(authProvider));
					break;
			}
		}

		Promise.all(promises).then((values) => {
			resolve(values);
		}).catch((error) => {
			reject(error);
		})

	});
}

async function getJWKS(provider: AuthProvider) {
	if(provider.jwks_keys !== undefined && provider.issuer_url == null && provider.jwks_url == null) {
		const jwks_keys = JSON.parse(provider.jwks_keys);	
		const jwksClient = new JwksClient({
			getKeysInterceptor: () => {
				return jwks_keys;
			},
			jwksUri: ''
		})
	

		provider.JWKSClient = jwksClient;
		
	}

	if(provider.issuer_url && !provider.jwks_url) {
		//try to discover with openid
		const issuer = await Issuer.discover(provider.issuer_url);
		if(issuer.metadata.jwks_uri != null) {
			provider.jwks_url = issuer.metadata.jwks_uri;
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

	// try to get the keys
	try {
		const keys = await jwksClient.getSigningKeys()
		if (keys.length == 0) {
			throw new InvalidJWKSUrl();
		}
	} catch (error) {
		throw new InvalidJWKSUrl();
	}

	return jwksClient;
}