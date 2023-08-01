import { parseJSON, toArray } from '@directus/utils';
import dotenv from 'dotenv';
import fs from 'fs';
import { clone, toNumber, toString } from 'lodash-es';
import path from 'path';
import { requireYAML } from '../require-yaml.js';


// keeping this here for now to prevent a circular import to constants.ts
const allowedEnvironmentVars = [
	// general
	'CONFIG_PATH',
	// auth
	'AUTH_PROVIDERS',
	'AUTH_.+_DRIVER',
	'AUTH_.+_CLIENT_ID',
	'AUTH_.+_CLIENT_SECRET',
	'AUTH_.+_SCOPE',
	'AUTH_.+_AUTHORIZE_URL',
	'AUTH_.+_ACCESS_URL',
	'AUTH_.+_PROFILE_URL',
	'AUTH_.+_IDENTIFIER_KEY',
	'AUTH_.+_EMAIL_KEY',
	'AUTH_.+_FIRST_NAME_KEY',
	'AUTH_.+_LAST_NAME_KEY',
	'AUTH_.+_ALLOW_PUBLIC_REGISTRATION',
	'AUTH_.+_DEFAULT_ROLE_ID',
	'AUTH_.+_ICON',
	'AUTH_.+_LABEL',
	'AUTH_.+_PARAMS',
	'AUTH_.+_ISSUER_URL',
	'AUTH_.+_AUTH_REQUIRE_VERIFIED_EMAIL',
	'AUTH_.+_CLIENT_URL',
	'AUTH_.+_BIND_DN',
	'AUTH_.+_BIND_PASSWORD',
	'AUTH_.+_USER_DN',
	'AUTH_.+_USER_ATTRIBUTE',
	'AUTH_.+_USER_SCOPE',
	'AUTH_.+_MAIL_ATTRIBUTE',
	'AUTH_.+_FIRST_NAME_ATTRIBUTE',
	'AUTH_.+_LAST_NAME_ATTRIBUTE',
	'AUTH_.+_GROUP_DN',
	'AUTH_.+_GROUP_ATTRIBUTE',
	'AUTH_.+_GROUP_SCOPE',
    'AUTH_.+_TRUSTED',
    'AUTH_.+_JWKS_URL',
    'AUTH_.+_JWKS_KEYS',
	'AUTH_.+_JWT_ROLE_KEY',
	'AUTH_.+_JWT_ADMIN_KEY',
	'AUTH_.+_JWT_APP_KEY',
	'AUTH_.+_JWT_USEDB',
	'AUTH_.+_IDP.+',
	'AUTH_.+_SP.+',
].map((name) => new RegExp(`^${name}$`));

const acceptedEnvTypes = ['string', 'number', 'regex', 'array', 'json'];

const typeMap: Record<string, string> = {}

const defaults: Record<string, any> = {
	CONFIG_PATH: path.resolve(process.cwd(), '.env')
};


let env: Record<string, any> = {
    ...defaults,
	...process.env,
	...processConfiguration(),
};

process.env = env;

env = processValues(env);

export default env;

/**
 * Small wrapper function that makes it easier to write unit tests against changing environments
 */
export const getEnv = () => env;

/**
 * When changes have been made during runtime, like in the CLI, we can refresh the env object with
 * the newly created variables
 */
export function refreshEnv(): void {
	env = {
        ...defaults,
		...process.env,
		...processConfiguration(),
	};

	process.env = env;

	env = processValues(env);
}



function toBoolean(value: any): boolean {
	return value === 'true' || value === true || value === '1' || value === 1;
}

function processConfiguration() {
	const configPath = path.resolve(process.env['CONFIG_PATH'] || defaults['CONFIG_PATH']);
    

	if (fs.existsSync(configPath) === false) return {};

	const fileExt = path.extname(configPath).toLowerCase();

	if (fileExt === '.js') {
		const module = require(configPath);
		const exported = module.default || module;

		if (typeof exported === 'function') {
			return exported(process.env);
		} else if (typeof exported === 'object') {
			return exported;
		}

		throw new Error(
			`Invalid JS configuration file export type. Requires one of "function", "object", received: "${typeof exported}"`
		);
	}

	if (fileExt === '.json') {
		return require(configPath);
	}

	if (fileExt === '.yaml' || fileExt === '.yml') {
		const data = requireYAML(configPath);

		if (typeof data === 'object') {
			return data as Record<string, string>;
		}

		throw new Error('Invalid YAML configuration. Root has to be an object.');
	}

	// Default to env vars plain text files
	return dotenv.parse(fs.readFileSync(configPath, { encoding: 'utf8' }));
}

function getVariableType(variable: string) {
	return variable.split(':').slice(0, -1)[0];
}

function getEnvVariableValue(variableValue: string, variableType: string) {
	return variableValue.split(`${variableType}:`)[1];
}

function getEnvironmentValueWithPrefix(envArray: Array<string>): Array<string | number | RegExp> {
	return envArray.map((item: string) => {
		if (isEnvSyntaxPrefixPresent(item)) {
			return getEnvironmentValueByType(item);
		}

		return item;
	});
}

function getEnvironmentValueByType(envVariableString: string) {
	const variableType = getVariableType(envVariableString)!;
	const envVariableValue = getEnvVariableValue(envVariableString, variableType)!;

	switch (variableType) {
		case 'number':
			return toNumber(envVariableValue);
		case 'array':
			return getEnvironmentValueWithPrefix(toArray(envVariableValue));
		case 'regex':
			return new RegExp(envVariableValue);
		case 'string':
			return envVariableValue;
		case 'json':
			return tryJSON(envVariableValue);
	}
}

function isEnvSyntaxPrefixPresent(value: string): boolean {
	return acceptedEnvTypes.some((envType) => value.includes(`${envType}:`));
}

function processValues(env: Record<string, any>) {
	env = clone(env);

	for (let [key, value] of Object.entries(env)) {
		// If key ends with '_FILE', try to get the value from the file defined in this variable
		// and store it in the variable with the same name but without '_FILE' at the end
		let newKey: string | undefined;

		if (key.length > 5 && key.endsWith('_FILE')) {
			newKey = key.slice(0, -5);

			if (allowedEnvironmentVars.some((pattern) => pattern.test(newKey as string))) {
				if (newKey in env && !(newKey in defaults && env[newKey] === defaults[newKey])) {
					throw new Error(
						`Duplicate environment variable encountered: you can't use "${newKey}" and "${key}" simultaneously.`
					);
				}

				try {
					value = fs.readFileSync(value, { encoding: 'utf8' });
					key = newKey;
				} catch {
					throw new Error(`Failed to read value from file "${value}", defined in environment variable "${key}".`);
				}
			}
		}

		// Convert values with a type prefix
		// (see https://docs.directus.io/reference/environment-variables/#environment-syntax-prefix)
		if (typeof value === 'string' && isEnvSyntaxPrefixPresent(value)) {
			env[key] = getEnvironmentValueByType(value);
			continue;
		}

        // Convert values where the key is defined in typeMap
		if (typeMap[key]) {
			switch (typeMap[key]) {
				case 'number':
					env[key] = toNumber(value);
					break;
				case 'string':
					env[key] = toString(value);
					break;
				case 'array':
					env[key] = toArray(value);
					break;
				case 'json':
					env[key] = tryJSON(value);
					break;
				case 'boolean':
					env[key] = toBoolean(value);
			}

			continue;
		}		

		// Try to convert remaining values:
		// - boolean values to boolean
		// - 'null' to null
		// - number values (> 0 <= Number.MAX_SAFE_INTEGER) to number
		if (value === 'true') {
			env[key] = true;
			continue;
		}

		if (value === 'false') {
			env[key] = false;
			continue;
		}

		if (value === 'null') {
			env[key] = null;
			continue;
		}

		if (
			String(value).startsWith('0') === false &&
			isNaN(value) === false &&
			value.length > 0 &&
			value <= Number.MAX_SAFE_INTEGER
		) {
			env[key] = Number(value);
			continue;
		}

		if (String(value).includes(',')) {
			env[key] = toArray(value);
			continue;
		}

		// Try converting the value to a JS object. This allows JSON objects to be passed for nested
		// config flags, or custom param names (that aren't camelCased)
		env[key] = tryJSON(value);

		// If '_FILE' variable hasn't been processed yet, store it as it is (string)
		if (newKey) {
			env[key] = value;
		}
	}

	return env;
}

function tryJSON(value: any) {
	try {
		return parseJSON(value);
	} catch {
		return value;
	}
}