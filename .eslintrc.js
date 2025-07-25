module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json', './packages/*/tsconfig.json'],
  },
  ignorePatterns: ['.eslintrc.js'],
  plugins: ['@typescript-eslint', 'prettier', 'simple-import-sort'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    'prettier/prettier': 'error',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'no-console': ['error', { allow: ['error'] }],
  },
  overrides: [
    {
      // Disable TypeScript parsing for config files
      files: ['.eslintrc.js', '*.config.js'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script',
      },
      env: {
        node: true,
      },
    },
    {
      // Disable TypeScript parsing for checksum test files
      files: ['packages/checksum/__tests__/**/*.ts'],
      extends: ['eslint:recommended'],
      rules: {
        'prettier/prettier': 'error',
        'no-undef': 'off',
        'no-unused-vars': 'off',
      },
    },
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
        'no-constant-condition': 'off', // Allow while(true) loops in tests
      },
    },
  ],
};
