import { defineHook } from '@directus/extensions-sdk';
import { createError } from '@directus/errors';

import { getAccountabilityForToken } from './external-jwt/get-accountability-for-token';
import type { Request } from 'express';
import type { Accountability } from '@directus/types';
import jwt from 'jsonwebtoken';


const InvalidTokenError = createError('INVALID_TOKEN_ERROR', 'Could not validate external JWT token', 500);


export default defineHook(({ filter }) => {
	
	// get all configuration
	
	filter('authenticate', (defaultAccountability, event, context)  => {
		let req = <Request>event['req'];
		if(!req.token) return defaultAccountability;

		if(!context.database) {
			return defaultAccountability
		}

		const decodedToken = jwt.decode(req.token);
		if(typeof decodedToken === 'string') return defaultAccountability; // if token is not a jwt, let directus handle it
		if(decodedToken?.iss == 'directus') return defaultAccountability; // if token issued by directus, let directus handle it


		

		return getAccountabilityForToken(req.token, decodedToken?.iss, context.accountability, context.database)
	});

	filter('auth.jwt', (status, user, provider) => {

	})

});


