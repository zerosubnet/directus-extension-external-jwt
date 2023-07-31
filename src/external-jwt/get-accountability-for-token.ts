import type { Accountability } from '@directus/types';
import type { JwtHeader, VerifyCallback} from 'jsonwebtoken';
import {JsonWebTokenError} from 'jsonwebtoken';
import { getAuthProviders } from './get-auth-providers';
import jwt from 'jsonwebtoken';


const authProviders = getAuthProviders();


// TODO: optimize this function, reduce the amount of loops
async function getKey(header: JwtHeader | undefined, callback: VerifyCallback<string>) {
	for (const authProvider of (await authProviders)) {
		if(!header) return new JsonWebTokenError("No header found")
		authProvider.getSigningKey(header.kid, function (err, key) {
			if (err) {
				return new JsonWebTokenError("Could not retrieve any valid keys with key id(kid)");
			}
			if(key == null) return new JsonWebTokenError("No valid key found");
			
			
			const signingKey = key.getPublicKey();
			return callback(null, signingKey);
		});
	}

    return new JsonWebTokenError("No auth provider in list");
}

export async function getAccountabilityForToken(
	token?: string | null,
	accountability?: Accountability
): Promise<Accountability> {
    if (!accountability) {
		accountability = {
			user: null,
			role: null,
			admin: false,
			app: false,
		};
	}

    if (token) {
        const decodedToken = jwt.decode(token);
        if(typeof decodedToken === 'string') return accountability; // if token is not a jwt, let directus handle it
        if(decodedToken?.iss == 'directus') return accountability; // if token issued by directus, let directus handle it
        

        jwt.verify(token, getKey,{
        }, function(err, decoded) {
			if (err) {
				console.log(err)
				return accountability;
			}

			console.log(decoded)
            
            // We have a valid token, validate user against database.
            // We must also check against the correct provider.

            // TODO: add cache support
            // TODO: add database check



			return accountability;
		});
    }

    return accountability;
}