## @naturalcycles/cli

> CLI utils to be installed globally via 'npm i -g'

[![npm](https://img.shields.io/npm/v/@naturalcycles/cli/latest.svg)](https://www.npmjs.com/package/@naturalcycles/cli)
[![install size](https://packagephobia.now.sh/badge?p=@naturalcycles/cli)](https://packagephobia.now.sh/result?p=@naturalcycles/cli)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Install

`npm i -g @naturalcycles/cli`

# CLI commands (globally available)

- `tsn`: short alias for `ts-node` with additional parameters
  `-T -r tsconfig-paths/register -r dotenv/config`. Will use `./scripts/tsconfig.json` (file will be
  auto-generated in not present).

- ...

# Packaging

- `engines.node`: Latest Node.js LTS
- `main: dist/index.js`: commonjs, es2019
