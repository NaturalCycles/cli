#!/usr/bin/env node

/*
This CLI command is optimized for speed, so, it includes minimum dependencies
 */

// @ts-expect-error polyfill
Symbol.dispose ??= Symbol('Symbol.dispose')
// @ts-expect-error polyfill
Symbol.asyncDispose ??= Symbol('Symbol.asyncDispose')

import fs from 'node:fs'
import path from 'node:path'
import { styleText } from 'node:util'
import type nodejsLib from '@naturalcycles/nodejs-lib'

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

  require('dotenv/config')

  // Esbuild support currently disabled
  // if (TSN_ESBUILD) {
  //   const { register } = require('esbuild-register/dist/node')
  //   register({
  //     tsconfigRaw: fs.readFileSync(projectTsconfigPath, 'utf8'),
  //   })
  // }

  const tsnode = require('ts-node')
  tsnode.register({
    transpileOnly: true,
    project: projectTsconfigPath,
  })

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

  const {
    platform,
    arch,
    versions: { node },
    env: { NODE_OPTIONS },
  } = process

  console.log(
    dimGrey(`node ${node} ${platform} ${arch}, NODE_OPTIONS: ${NODE_OPTIONS || 'not defined'}`),
  )

  if (!NODE_OPTIONS) {
    console.warn(
      `NODE_OPTIONS env variable is not defined. You may run into out-of-memory issues when running memory-intensive scripts. It's recommended to set it to:\n--max-old-space-size=12000`,
    )
  } else if (NODE_OPTIONS.includes('max_old')) {
    console.warn(
      `It looks like you're using "max_old_space_size" syntax with underscores instead of dashes - it's WRONG and doesn't work in environment variables. Strongly advised to rename it to "max-old-space-size"`,
    )
  }

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
        `${boldRed('tsn')} script not found: ${boldWhite(scriptPathOriginal)}`,
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

    const { kpySync } = require('@naturalcycles/nodejs-lib') as typeof nodejsLib

    kpySync({
      baseDir: `${cfgDir}/scripts/`,
      inputPatterns: ['tsconfig.json'],
      outputDir: './scripts',
    })

    console.log(`${boldGrey('scripts/tsconfig.json')} file is automatically added`)
  }

  return projectTsconfigPath
}

function boldGrey(s: string): string {
  return styleText(['bold', 'grey'], s)
}

function boldWhite(s: string): string {
  return styleText(['bold', 'white'], s)
}

function boldRed(s: string): string {
  return styleText(['bold', 'red'], s)
}

function dimGrey(s: string): string {
  return styleText(['dim', 'grey'], s)
}
