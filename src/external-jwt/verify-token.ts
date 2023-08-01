import type { AuthProvider } from "./authProvider/get-auth-providers.js";
import jwt from 'jsonwebtoken';

export function verify_token(provider: AuthProvider, token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
        if (provider.JWKSClient === undefined){
            return reject('JWKSClient not initialized');
        }

        jwt.verify(
            token,
            (header, callback) => {
                provider.JWKSClient?.getSigningKey(header.kid, (err, key) => {
                    const signingKey = key?.getPublicKey();
                    callback(err, signingKey);
                });
            },
            {
                complete: false,
            },
            (err, decoded) => {
                if (err || decoded === undefined || typeof decoded === 'string') {
                    return reject(err);
                }
                return resolve(decoded);
            }
        )
        })
    
}
