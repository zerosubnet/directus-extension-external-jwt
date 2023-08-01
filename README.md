# External JWT Plugin for Directus
## This plugin serves as a way to make Directus trust externally signed JWT tokens from an OIDC or OAuth2 provider.

The plugin expects to resolve the following new configuration option

The provider must issues Access tokens as JWT since this is used for verification right now. Might add support for general tokens later.



|AUTH_PROVIDER_TRUSTED| True | Must be true for the provider to be considered as trusted. Note, do not trust public providers as these can generate tokens that you cannot control.
|AUTH_PROVIDER_JWT_ROLE_KEY | String | What key in the JWT payload contains the role
|AUTH_PROVIDER_JWT_ADMIN_KEY | Boolean | What key in the JWT payload contains a bool to grant admin rights
|AUTH_PROVIDER_JWT_APP_KEY | Boolean | What key in the JWT payload contains a bool to allow app access