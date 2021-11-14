#!/usr/bin/env node

/*
This CLI command is optimized for speed, so, it includes minimum dependencies
 */

import * as fs from 'fs'
import * as path from 'path'
import type * as nodejsLib from '@naturalcycles/nodejs-lib/dist/fs'
import * as c from 'chalk'

const projectDir = path.join(__dirname, '../..')
const cfgDir = `${projectDir}/cfg`
const { CLI_DEBUG, TSN_ESBUILD } = process.env

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

  // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
  const [, , scriptPathOriginal = '', ..._processArgs] = process.argv
  const cwd = process.cwd()

  if (CLI_DEBUG) {
    console.log({
      arg_initial: process.argv,
    })
  }

  process.argv = [process.argv[0]!, ...process.argv.slice(2)]

  if (CLI_DEBUG) {
    console.log({
      argv_processed: process.argv,
      projectTsconfigPath,
    })
  }

  require('loud-rejection/register')
  require('dotenv/config')

  if (TSN_ESBUILD) {
    const { register } = require('esbuild-register/dist/node')
    register({
      tsconfigRaw: fs.readFileSync(projectTsconfigPath, 'utf8'),
    })
  } else {
    const tsnode = require('ts-node')
    tsnode.register({
      transpileOnly: true,
      project: projectTsconfigPath,
    })
  }

  if (fs.existsSync(`./node_modules/tsconfig-paths`)) {
    // ok, for the `paths` it works to load from the root `tsconfig` too
    // process.env['TS_NODE_PROJECT'] = projectTsconfigPath

    try {
      require(require.resolve(`${cwd}/node_modules/tsconfig-paths/register`))
    } catch (err) {
      // log and suppress
      console.error(err)
    }

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
  const dotTS = scriptPathOriginal.endsWith('.ts')
  const inScripts = scriptPathOriginal.includes('scripts/')

  const candidates = [
    scriptPathOriginal,
    !dotTS && `${scriptPathOriginal}.ts`,
    !dotTS && `${scriptPathOriginal}.script.ts`,
    !inScripts && `scripts/${scriptPathOriginal}`,
    !inScripts && !dotTS && `scripts/${scriptPathOriginal}.ts`,
    !inScripts && !dotTS && `scripts/${scriptPathOriginal}.script.ts`,
  ].filter(Boolean) as string[]

  const scriptPath = candidates.find(fs.existsSync)

  if (CLI_DEBUG) {
    console.log({
      scriptPathOriginal,
      scriptPath,
    })
  }

  if (!scriptPath) {
    console.log(
      [
        '',
        `${c.bold.red('tsn')} script not found: ${c.bold.white(scriptPathOriginal)}`,
        '',
        `cwd: ${cwd}`,
        '',
        'tried to find it in these paths:',
        ...candidates.map(s => '  ' + s),
        '',
      ].join('\n'),
    )
    process.exit(1)
  }

  const scriptPathResolved = require.resolve(`${cwd}/${scriptPath}`)

  if (CLI_DEBUG) {
    console.log({
      scriptPathResolved,
    })
  }

  // Should be loadable now due to tsnode being initialized already
  require(scriptPathResolved)
}

/**
 * Returns path to /scripts/tsconfig.json
 */
function ensureProjectTsconfigScripts(): string {
  const projectTsconfigPath = `scripts/tsconfig.json`

  if (!fs.existsSync(projectTsconfigPath)) {
    // You cannot just use a shared `tsconfig.scripts.json` because of relative paths for `include`
    // So, it will be copied into the project

    const { kpySync } = require('@naturalcycles/nodejs-lib/dist/fs') as typeof nodejsLib

    kpySync({
      baseDir: `${cfgDir}/scripts/`,
      inputPatterns: ['tsconfig.json'],
      outputDir: './scripts',
    })

    console.log(`${c.bold.grey('scripts/tsconfig.json')} file is automatically added`)
  }

  return projectTsconfigPath
}
