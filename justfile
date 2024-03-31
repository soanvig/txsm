lint:
  pnpm eslint "./src/**/*.ts"

test file='':
	node --import './import-esm.mjs' --test ./test/**/*{{file}}*.spec.mts