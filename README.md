# External JWT Plugin for Directus

## This plugin serves as a way to make Directus trust externally signed tokens from an OIDC or OAuth2 provider.

The plugin supports two modes of token validation:

- **JWT verification** -- Validates JWT access tokens by checking the signature against the provider's JWKS (JSON Web Key Set). The token's `iss` claim is matched to a configured provider.
- **Token introspection (RFC 7662)** -- Validates opaque (non-JWT) tokens by calling the provider's introspection endpoint. This is useful for providers like Zitadel that can issue opaque Bearer tokens alongside JWTs.

If USEDB is enabled the extension will try to search for the user in the database by looking at the `sub` claim. The user must exist and all roles for that user will be used.

When using USEDB you should also enable the caching option to reduce the time spent against the API and reduce the number of DB lookups. The cache stores the user object based on the `sub` claim.

USEDB also validates that the issuer is the same as assigned to the user.

## Configuration

All configuration options listed here are an extension to Directus' default config.

| ENV Variable                 | Supported values        | Description  |
|------------------------------|-------------------------|--------------|
| AUTH_PROVIDER_TRUSTED        | `true`/`false`          | Must be true for the provider to be considered trusted. **Warning:** Do not trust public providers as they can generate tokens that you cannot control.  |
| AUTH_PROVIDER_JWT_ROLE_KEY   | String                  | The key in the JWT payload that contains the role information.  |
| AUTH_PROVIDER_JWT_ADMIN_KEY  | String                  | The key in the JWT payload that indicates if admin rights should be granted.  |
| AUTH_PROVIDER_JWT_APP_KEY    | String                  | The key in the JWT payload that allows app access if set to true.  |
| AUTH_PROVIDER_JWT_USEDB      | Boolean                 | If enabled, the plugin resolves the user and roles from the Directus database using the token (“sub” for OIDC). Should be used only with an enabled Redis Cache. |
| AUTH_PROVIDER_JWKS_URL       | String                  | The URL from which to fetch the JSON Web Key Set (JWKS) for token verification.  |
| AUTH_PROVIDER_JWKS_KEYS      | JSON                    | Inline JSON Web Keys for token verification if not using a JWKS URL.  |
| CACHE_JWT_NAMESPACE          | String                  | The namespace used in the cache store for JWT-related entries.  |
| CACHE_JWT_TTL                | Number                  | Time to live (in milliseconds) for the cached user entry. Default is 5000 (5 seconds).  |
| REDIS_JWT_DB                 | Number                  | The Redis database number to use for JWT caching. Default is 2.  |

### Token Introspection

These options enable validation of opaque tokens via [RFC 7662 Token Introspection](https://www.rfc-editor.org/rfc/rfc7662).

| ENV Variable                              | Supported values  | Description  |
|-------------------------------------------|-------------------|--------------|
| AUTH_PROVIDER_INTROSPECTION_URL           | String            | The token introspection endpoint URL (e.g. `https://your-domain.com/oauth/v2/introspect`).  |
| AUTH_PROVIDER_INTROSPECTION_AUTH_METHOD   | `basic` / `jwt`   | Authentication method for the introspection endpoint. `basic` (default) uses `CLIENT_ID` and `CLIENT_SECRET` as HTTP Basic Auth. `jwt` uses private_key_jwt with a signed client assertion.  |
| AUTH_PROVIDER_INTROSPECTION_KEY           | String            | Private key for JWT introspection auth. Accepts a raw PEM key, a Zitadel JSON key file, or a **base64-encoded** version of either. Falls back to `CLIENT_SECRET` if not set.  |
| AUTH_PROVIDER_INTROSPECTION_KEY_FILE      | String            | Path to a file containing the private key (e.g. `/secrets/zitadel-key.json`). The file is read at startup via the Directus `_FILE` variable pattern.  |

When using `basic` auth, the existing `AUTH_PROVIDER_CLIENT_ID` and `AUTH_PROVIDER_CLIENT_SECRET` are used.

When using `jwt` auth (private_key_jwt), provide the key via `AUTH_PROVIDER_INTROSPECTION_KEY` (inline or base64-encoded), `AUTH_PROVIDER_INTROSPECTION_KEY_FILE` (path to key file), or fall back to `AUTH_PROVIDER_CLIENT_SECRET`. The key can be:
- A PEM-encoded RSA private key
- A Zitadel-style JSON key file (containing `keyId`, `key`, `appId`, `clientId`)
- A **base64-encoded** version of either of the above (automatically detected and decoded)