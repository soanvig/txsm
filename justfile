lint:
  pnpm eslint "./src/**/*.ts"

test file='':
	node --loader ts-node/esm --test ./test/**/*{{file}}*.spec.mts