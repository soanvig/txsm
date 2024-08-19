lint:
  pnpm eslint "./src/**/*.mts"

typecheck:
  pnpm tsc --noEmit

test file='':
	node --import './import-esm.mjs' --test ./test/**/*{{file}}*.spec.mts

build:
  rm -rf ./build
  pnpm tsc -p tsconfig.build.json --module nodenext --outDir build/esm
  pnpm tsc -p tsconfig.build.json --module commonjs --outDir build/cjs
  nu ./afterbuild-cjs-esm.nu

publish:
  pnpm install
  just lint
  just typecheck
  just test
  just build
  pnpm publish --no-git-checks