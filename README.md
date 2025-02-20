# External JWT Plugin for Directus

## This plugin serves as a way to make Directus trust externally signed JWT tokens from an OIDC or OAuth2 provider.

The plugin expects to resolve the following new configuration options.

The provider must issue Access tokens as JWT since this is used for verification right now. (Support for general tokens may be added later.)

If USEDB is enabled the extension will try to search for the user in the database by looking at the sub in the JWT token. The user must exist and all roles for that user will be used.

When using USEDB you should also enable the caching option to reduce the time spent against the API and reduce the number of DB lookups. The cache stores the user object based on the sub in the token.

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