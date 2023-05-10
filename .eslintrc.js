module.exports = {
  env: {
    es6: true
  },
  extends: ['prettier'],
  parserOptions: {
    warnOnUnsupportedTypeScriptVersion: false,
    project: ['./tsconfig.json']
  },
  overrides: [
    {
      files: ['*.ts'],
      extends: ['standard-with-typescript', 'plugin:import/typescript'],
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true
        }
      },
      rules: {
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/no-floating-promises': 0,
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/space-before-function-paren': 0,
        '@typescript-eslint/strict-boolean-expressions': 0,
        '@typescript-eslint/prefer-nullish-coalescing': 0,
        '@typescript-eslint/naming-convention': 0,
        'multiline-ternary': 0,
        'no-void': 0,
        'import/no-cycle': 1,
        '@typescript-eslint/no-invalid-void-type': 0,
        '@typescript-eslint/restrict-template-expressions': 0,
        'no-trailing-space': 0,
        'no-useless-escape': 0,
        '@typescript-eslint/no-dynamic-delete': 0,
        '@typescript-eslint/prefer-ts-expect-error': 0
      }
    },

    {
      files: '*',
      globals: {
        __DEV__: 'readonly'
      }
    }
  ]
}
