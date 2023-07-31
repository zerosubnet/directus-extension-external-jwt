import { toArray } from '@directus/utils';
import {JwksClient} from 'jwks-rsa';

import { Issuer } from 'openid-client';

import env from './config';
import { createError } from '@directus/errors';

const InvalidJWKIssuerMetadata = createError('INVALID_JWKS_ISSUER_ERROR', 'No JWKS_URL or JWKS_KEYS and could not discover JWKS_URL from openid metadata', 500);
const InvalidJWKSUrl = createError('INVALID_JWKS_ISSUER_ERROR', 'Could not retrieve any valid keys from JWKS_URL', 500);

interface AuthProvider {
	label: string;
	name: string;
	driver: string;
	icon?: string;
	trusted: boolean;
	jwks_url?: string;
	jwks_keys?: string;
	issuer_url?: string;
}



export async function getAuthProviders(): Promise<JwksClient[]> {
	return new Promise(async (resolve, reject) => {
		const authProviders = toArray(env['AUTH_PROVIDERS'])
			.filter((provider) => provider && env[`AUTH_${provider.toUpperCase()}_DRIVER`])
			.map((provider) => ({
				name: provider,
				label: env[`AUTH_${provider.toUpperCase()}_LABEL`],
				driver: env[`AUTH_${provider.toUpperCase()}_DRIVER`],
				icon: env[`AUTH_${provider.toUpperCase()}_ICON`],
				trusted: env[`AUTH_${provider.toUpperCase()}_TRUSTED`],
				jwks_url: env[`AUTH_${provider.toUpperCase()}_JWKS_URL`],
				jwks_keys: env[`AUTH_${provider.toUpperCase()}_JWKS_KEYS`],
				issuer_url: env[`AUTH_${provider.toUpperCase()}_ISSUER_URL`],
			}));

		
		if(authProviders.length === 0) return resolve([]);

		

		var promises = [];

		for (const authProvider of authProviders) {
			switch (authProvider.driver) {	
				case 'openid':
					if (!authProvider.trusted || (!authProvider.issuer_url && !authProvider.jwks_url && !authProvider.jwks_keys)) break;
					promises.push(getJWKS(authProvider.issuer_url, authProvider.jwks_url, authProvider.jwks_keys));
					break;
				case 'oauth2':
					if (!authProvider.trusted || (!authProvider.issuer_url && !authProvider.jwks_url && !authProvider.jwks_keys)) break;
					promises.push(getJWKS(authProvider.issuer_url, authProvider.jwks_url, authProvider.jwks_keys));
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

function getJWKS(issuer_url: string, jwks_url: string, jwks_keys: string): Promise<JwksClient>{
	return new Promise(async (resolve, reject) => {
		if(jwks_keys && !issuer_url && !jwks_url) {
			const jwksClient = new JwksClient({
				getKeysInterceptor: () => {
					return JSON.parse(jwks_keys);
				},
				jwksUri: ''
			})

			resolve(jwksClient);
			return;
		}

		if(issuer_url && !jwks_url) {
			//try to discover with openid
			try {
				const issuer = await Issuer.discover(issuer_url);
				if(issuer.metadata.jwks_uri != null) {
					jwks_url = issuer.metadata.jwks_uri;
				}
			} catch (error) {
				//throw new InvalidJWKIssuerMetadata();
				reject("Could not discover JWKS_URL from openid metadata")
			}
		}

		const jwksClient = new JwksClient({
			jwksUri: jwks_url,
			cache: true,
			cacheMaxAge: 36000000, // 10 hours
			cacheMaxEntries: 10,
			timeout: 30000, // 30 seconds
		});

		// try to get the keys
		try {
			const keys = await jwksClient.getSigningKeys()
			if (keys.length == 0) {
				reject("Could not retrieve any valid keys from JWKS_URL")
			}
		} catch (error) {
			throw new InvalidJWKSUrl();
		}
		
		resolve(jwksClient);

	})

	
}