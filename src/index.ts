import { defineHook } from '@directus/extensions-sdk';
import { getAccountabilityForToken, introspectAndGetAccountability } from './external-jwt/get-accountability-for-token';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import type { HookConfig } from '@directus/extensions';
import type { Accountability, EventContext } from '@directus/types';

export default defineHook<HookConfig>(({ filter }) => {

	filter('authenticate', async (defaultAccountability: Accountability, event, context: EventContext) => {
		const req = <Request>event['req'];
		if (!req.token) return defaultAccountability;

		if (!context.database) {
			return defaultAccountability;
		}

		const decodedToken = jwt.decode(req.token);

		// If token is a Directus-issued JWT, let Directus handle it
		if (decodedToken && typeof decodedToken !== 'string' && decodedToken.iss === 'directus') {
			return defaultAccountability;
		}

		// If token is a valid JWT with an external issuer, verify via JWKS
		if (decodedToken && typeof decodedToken !== 'string') {
			return getAccountabilityForToken(req.token, decodedToken.iss, context.accountability, context.database);
		}

		// Token is not a JWT (opaque) -- try introspection
		try {
			const result = await introspectAndGetAccountability(req.token, context.accountability, context.database);
			if (result !== null) return result;
		} catch {
			// Introspection failed, fall back to Directus default handling
		}

		return defaultAccountability;
	});

});
