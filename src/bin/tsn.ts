#!/usr/bin/env node

/*
This CLI command is optimized for speed, so, it includes minimum dependencies
 */

import type * as fsLib from '@naturalcycles/fs-lib'
import * as c from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import * as tsnode from 'ts-node'

export const projectDir = path.join(__dirname, '..')
export const cfgDir = `${projectDir}/cfg`

main().catch(err => {
  console.error(err)
  process.exit(1)
})

async function main(): Promise<void> {
  const projectTsconfigPath = await ensureProjectTsconfigScripts()

  let [, , scriptPath = '', ..._processArgs] = process.argv

  // Prepend ./scripts/ if needed
  if (
    !scriptPath.startsWith('scripts/') &&
    !scriptPath.startsWith('./') &&
    !scriptPath.startsWith('/')
  ) {
    const newPath = './scripts/' + scriptPath
    if (fs.existsSync(newPath)) {
      scriptPath = newPath
    }
  }

  require('loud-rejection/register')
  require('dotenv/config')
  tsnode.register({
    transpileOnly: true,
    project: projectTsconfigPath,
  })

  if (nodeModuleExists('tsconfig-paths')) {
    require('tsconfig-paths/register')
  }

  const { NODE_OPTIONS } = process.env

  if (NODE_OPTIONS) {
    console.log(`${c.dim.grey('NODE_OPTIONS: ' + NODE_OPTIONS)}`)
  } else {
    console.log(`${c.dim.grey('NODE_OPTIONS are not defined')}`)
  }

  scriptPath = require.resolve(`${process.cwd()}/${scriptPath}`)
  console.log({
    scriptPath,
  })

  // Should be loadable now due to tsnode being initialized already
  require(scriptPath)
}

/**
 * Returns path to /scripts/tsconfig.json
 */
async function ensureProjectTsconfigScripts(): Promise<string> {
  const projectTsconfigPath = `./scripts/tsconfig.json`

  if (!fs.existsSync(projectTsconfigPath)) {
    // You cannot just use a shared `tsconfig.scripts.json` because of relative paths for `include`
    // So, it will be copied into the project

    const { kpy } = require('@naturalcycles/fs-lib') as typeof fsLib

    await kpy({
      baseDir: `${cfgDir}/scripts/`,
      inputPatterns: ['tsconfig.json'],
      outputDir: './scripts',
    })

    console.log(`${c.bold.grey('/scripts/tsconfig.json')} file is automatically added`)
  }

  return projectTsconfigPath
}

function nodeModuleExists(moduleName: string): boolean {
  return fs.existsSync(`./node_modules/${moduleName}`)
}
