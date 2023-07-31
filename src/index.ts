import { defineHook } from '@directus/extensions-sdk';
import { createError } from '@directus/errors';

import { getAccountabilityForToken } from './external-jwt/get-accountability-for-token';
import type { Request } from 'express';
import type { Accountability } from '@directus/types';


const InvalidTokenError = createError('INVALID_TOKEN_ERROR', 'Could not validate external JWT token', 500);


export default defineHook(({ filter }) => {
	
	// get all configuration
	
	filter('authenticate', (accountability, event, context)  => {
		let req = <Request>event['req'];
		let account = <Accountability>accountability;

		if(!req.token) return accountability;

		return getAccountabilityForToken(req.token, account)
	});

	filter('auth.jwt', (status, user, provider) => {

	})

});


