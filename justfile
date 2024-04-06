lint:
  pnpm eslint "./src/**/*.ts"

typecheck:
  pnpm tsc --noEmit

test file='':
	node --import './import-esm.mjs' --test ./test/**/*{{file}}*.spec.mts