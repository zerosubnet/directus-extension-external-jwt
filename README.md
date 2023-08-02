# External JWT Plugin for Directus
## This plugin serves as a way to make Directus trust externally signed JWT tokens from an OIDC or OAuth2 provider.

The plugin expects to resolve the following new configuration option

The provider must issues Access tokens as JWT since this is used for verification right now. Might add support for general tokens later.

If USEDB are enabled the extension will try to search for the user in the database by looking at the sub in the JWT token. The user must exists and all roles for that use will be used. 

When using USEDB you should also enable the caching option to reduce the time spent against the api and reduce the number of db lookups. The cache stores the user object in the cache based on the sub in the token. 

USEDB also validates that the issuer is the same as assigned to the user. 

## Configuration
all configuration options listed here are an extension to directus default config.

| ENV Variable                 | Supported values  | Description  |
|------------------------------|-------------------|--------------|
| AUTH_PROVIDER_TRUSTED        | True/False        | Must be true for the provider to be considered as trusted. Note, do not trust public providers as these can generate tokens that you cannot control.  
| AUTH_PROVIDER_JWT_ROLE_KEY   | String            | What key in the JWT payload contains the role  |
| AUTH_PROVIDER_JWT_ADMIN_KEY  | String            | What key in the JWT payload contains a bool to grant admin rights  |
| AUTH_PROVIDER_JWT_APP_KEY    | String            | What key in the JWT payload contains a bool to allow app access
| AUTH_PROVIDER_JWT_USEDB      | Bool              | If enabled/true the plugin will resolve the user and roles from the directus database using the token. For OIDC the sub is used. Should not be used without a Redis Cache enabled.
| CACHE_JWT_NAMESPACE          | String            | What namespace to use in cache store.
| CACHE_JWT_TTL                | Number            | Time to live for the cached user entry, default 5000 (5 seconds)
