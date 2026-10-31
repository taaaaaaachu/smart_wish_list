import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';

export default ts.config(
	{
		// 生成物は対象外。
		ignores: ['node_modules/', 'dist/', '.wrangler/', 'worker-configuration.d.ts']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	}
);
