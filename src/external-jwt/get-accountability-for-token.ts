import type { Accountability } from '@directus/types';
import { getAuthProviders } from './authProvider/get-auth-providers.js';
import type { Knex } from 'knex';
import { verify_token } from './verify-token.js';



const authProviders = await getAuthProviders();

/*
const MissingJWTHeaderError = createError('INVALID_JWKS_ISSUER_ERROR', 'No header in JWT Token', 500);
const NoValidKeysError = createError('INVALID_JWKS_ISSUER_ERROR', 'could not retrieve any valid keys with key id(kid)', 500);
const NoAuthProvidersError = createError('INVALID_JWKS_ISSUER_ERROR', 'No auth providers in the list', 500);
*/

// TODO: optimize this function, reduce the amount of loops


export async function getAccountabilityForToken(
	token: string | null,
	iss: string[] | string | undefined,
	accountability: Accountability | null,
	database: Knex
): Promise<Accountability> {
    if (!accountability) {
		accountability = {
			user: null,
			role: null,
			admin: false,
			app: false,
		};
	}

	if (token == null || iss == null) {
		return accountability
	}

	return new Promise((resolve, reject) => {
		const providers = authProviders.filter((provider) => provider && iss.includes(provider.client_id));
		if(providers.length === 0) return accountability;
		if(providers.length > 1) {
			console.log("to many matching providers");
			return accountability;
		}

		const provider = providers[0];

		

		verify_token(provider, token).then(async (result) => {
			if(accountability) {
				// check if role key is set else try role key

				if(provider.role_key != null) {
					accountability.role = typeof result[provider.role_key] === 'string' ? result[provider.role_key] : result[provider.role_key][0];
				} else {
					if (result.role) {
						accountability.role = result.role;
					}
				}

				if(provider.use_database) { // use database to get user
					// TODO: Add caching to this function

					const user = await database
						.select('directus_users.id', 'directus_users.role', 'directus_roles.admin_access', 'directus_roles.app_access')
						.from('directus_users')
						.leftJoin('directus_roles', 'directus_users.role', 'directus_roles.id')
						.where({
							'directus_users.external_identifier': result.sub,
							'directus_users.provider': provider.name,
						})
						.first();
					
					if(!user) {
						reject("invalid user credentials");
					}

					accountability.user = user.id;
					accountability.role = user.role;
					accountability.admin = user.admin_access === true || user.admin_access == 1;
					accountability.app = user.app_access === true || user.app_access == 1;
				} else {
					if(provider.admin_key != null) {
						accountability.admin = result[provider.admin_key];
					}
					if(provider.app_key != null) {
						accountability.app = result[provider.app_key];
					}
					accountability.user = result.sub;
					
					
				}
				
				console.log(accountability);
				
				resolve(accountability);
			}

			reject("no accountability");

			

		})

        
    

	});

}