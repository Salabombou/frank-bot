/**
 * @type {import('prettier').Options}
 */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'none',
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: ['<THIRD_PARTY_MODULES>', './events', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true
};
