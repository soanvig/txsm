lint:
  pnpm eslint "./src/**/*.ts"

typecheck:
  pnpm tsc --noEmit

test file='':
	node --import './import-esm.mjs' --test ./test/**/*{{file}}*.spec.mts

build:
  rm -rf ./build
  pnpm tsc -p ./tsconfig.build.json

publish:
  just lint
  just typecheck
  just test
  just build
  pnpm publish