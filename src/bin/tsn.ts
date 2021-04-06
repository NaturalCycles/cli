#!/usr/bin/env node

/*
This CLI command is optimized for speed, so, it includes minimum dependencies
 */

import type * as nodejsLib from '@naturalcycles/nodejs-lib/dist/fs'
import * as c from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import * as tsnode from 'ts-node'

const projectDir = path.join(__dirname, '../..')
const cfgDir = `${projectDir}/cfg`
const { CLI_DEBUG } = process.env

try {
  main()
} catch (err) {
  console.error(err)
  console.log({ argv: process.argv })
  process.exit(1)
}

// todo: just use/exec freaking ts-node
function main(): void {
  const projectTsconfigPath = ensureProjectTsconfigScripts()

  // remove argv[1] from the array
  // before:
  // '/usr/local/bin/node',
  // '/Users/kirill/Idea/cli/node_modules/.bin/tsn', << that one
  // './src/bin/tsn.ts',
  // 'testscript.ts'
  //
  // after:
  // '/usr/local/bin/node',
  // './src/bin/tsn.ts',
  // 'testscript.ts'

  const [, , _scriptPath = '', ..._processArgs] = process.argv
  const cwd = process.cwd()

  if (CLI_DEBUG) {
    console.log({
      argv1: process.argv,
    })
  }

  process.argv = [process.argv[0]!, ...process.argv.slice(2)]

  if (CLI_DEBUG) {
    console.log({
      argv2: process.argv,
      projectTsconfigPath,
    })
  }

  require('loud-rejection/register')
  require('dotenv/config')

  tsnode.register({
    transpileOnly: true,
    project: projectTsconfigPath,
  })

  if (fs.existsSync(`./node_modules/tsconfig-paths`)) {
    require(require.resolve(`${cwd}/node_modules/tsconfig-paths/register`))

    // Kirill: this didn't work ;(
    // const json5 = require('json5')
    // const tsconfig = json5.parse(fs.readFileSync(projectTsconfigPath, 'utf8'))
    // const { baseUrl, paths } = tsconfig.compilerOptions || {}
    //
    // const tsconfigPaths = require(require.resolve(`${cwd}/node_modules/tsconfig-paths`))
    // tsconfigPaths.register({
    //   baseUrl,
    //   paths,
    // })
  }

  const { NODE_OPTIONS = 'not defined' } = process.env
  const { node } = process.versions

  console.log(`${c.dim.grey(`node ${node}, NODE_OPTIONS: ${NODE_OPTIONS}`)}`)

  // Resolve path
  // ./scripts/ ... .ts
  let scriptPath = [
    _scriptPath,
    `${_scriptPath}.ts`,
    `./scripts/${_scriptPath}`,
    `./scripts/${_scriptPath}.ts`,
    `./scripts/${_scriptPath}.script.ts`,
  ].find(fs.existsSync)

  if (CLI_DEBUG) {
    console.log({
      scriptPath,
    })
  }

  scriptPath = require.resolve(`${cwd}/${scriptPath}`)
  // console.log({
  //   scriptPath,
  // })

  // Should be loadable now due to tsnode being initialized already
  require(scriptPath)
}

/**
 * Returns path to /scripts/tsconfig.json
 */
function ensureProjectTsconfigScripts(): string {
  const projectTsconfigPath = `./scripts/tsconfig.json`

  if (!fs.existsSync(projectTsconfigPath)) {
    // You cannot just use a shared `tsconfig.scripts.json` because of relative paths for `include`
    // So, it will be copied into the project

    const { kpySync } = require('@naturalcycles/nodejs-lib/dist/fs') as typeof nodejsLib

    kpySync({
      baseDir: `${cfgDir}/scripts/`,
      inputPatterns: ['tsconfig.json'],
      outputDir: './scripts',
    })

    console.log(`${c.bold.grey('/scripts/tsconfig.json')} file is automatically added`)
  }

  return projectTsconfigPath
}
