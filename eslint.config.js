import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['dist/', 'test/', '.pnpm-store/'] },
	...tseslint.configs.recommended,
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-require-imports': 'warn',
		},
	},
);
