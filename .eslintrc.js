module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts'],
      },
    },
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

    /* TypeScript */
    // Fix ESLint error of "Cannot read property 'loc' of undefined."
    // https://github.com/typescript-eslint/typescript-eslint/issues/792#issuecomment-517762395
    indent: 'off',
    '@typescript-eslint/indent': ['error', 2],

    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn',
      {
        varsIgnorePattern: '_',
        argsIgnorePattern: '_',
      },
    ],

    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/type-annotation-spacing': 'error',
    '@typescript-eslint/member-delimiter-style': 'error',

    /* Import */
    'import/extensions': [
      'error',
      { ts: 'ignorePackages' },
    ],
    'import/order': ['error',
      {
        alphabetize: { order: 'asc' },
        'newlines-between': 'always',
      },
    ],
    'sort-imports': ['error',
      { ignoreDeclarationSort: true },
    ],
  },
};
