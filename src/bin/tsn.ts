#!/usr/bin/env node

/*
This CLI command is optimized for speed, so, it includes minimum dependencies
 */

import { kpy } from '@naturalcycles/fs-lib'
import { boldGrey, dimGrey } from '@naturalcycles/nodejs-lib/dist/colors'
import { execWithArgs } from '@naturalcycles/nodejs-lib/dist/exec'
import * as fs from 'fs-extra'
import { cfgDir } from '../paths.cnst'

main().catch(err => {
  console.error(err)
  process.exit(1)
})

async function main(): Promise<void> {
  const projectTsconfigPath = await ensureProjectTsconfigScripts()

  let [, , scriptPath = '', ...processArgs] = process.argv

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

  const args: string[] = [
    '-T',
    '-P',
    projectTsconfigPath,
    '-r',
    'loud-rejection/register',
    '-r',
    'dotenv/config',
  ]

  if (nodeModuleExists('tsconfig-paths')) {
    args.push('-r', 'tsconfig-paths/register')
  }

  const { NODE_OPTIONS } = process.env

  if (NODE_OPTIONS) {
    console.log(`${dimGrey('NODE_OPTIONS: ' + NODE_OPTIONS)}`)
  } else {
    console.log(`${dimGrey('NODE_OPTIONS are not defined')}`)
  }

  await execWithArgs('ts-node', [...args, scriptPath, ...processArgs])
}

/**
 * Returns path to /scripts/tsconfig.json
 */
async function ensureProjectTsconfigScripts(): Promise<string> {
  const projectTsconfigPath = `./scripts/tsconfig.json`

  if (!fs.pathExistsSync(projectTsconfigPath)) {
    // You cannot just use a shared `tsconfig.scripts.json` because of relative paths for `include`
    // So, it will be copied into the project

    await kpy({
      baseDir: `${cfgDir}/scripts/`,
      inputPatterns: ['tsconfig.json'],
      outputDir: './scripts',
    })

    console.log(`${boldGrey('/scripts/tsconfig.json')} file is automatically added`)
  }

  return projectTsconfigPath
}

function nodeModuleExists(moduleName: string): boolean {
  return fs.pathExistsSync(`./node_modules/${moduleName}`)
}
