module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json', './packages/**/*/tsconfig.json']
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'simple-import-sort'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    'prettier/prettier': 'error',
    'simple-import-sort/imports': 'error',
  },
  overrides: [
    {
      // Apply this rule to all files
      files: ['**/*'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Literal[bigint]',
            message:
              'Avoid using bigint literals. Please use BigInt function notation instead. E.g., BigInt("123") instead of 123n.',
          },
        ],
      },
    },
    {
      // Exclude this rule for test files (*.test.js, *.test.ts, *.spec.js, *.spec.ts)
      files: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
