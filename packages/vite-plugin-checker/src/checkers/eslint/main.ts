import os from 'os'
import path from 'path'
import invariant from 'tiny-invariant'
import { ESLint } from 'eslint'
import { parentPort } from 'worker_threads'

import { Checker } from '../../Checker'
import {
  diagnosticToTerminalLog,
  diagnosticToViteError,
  ensureCall,
  normalizeEslintDiagnostic,
} from '../../logger'

import type { CreateDiagnostic } from '../../types'
import type { ErrorPayload } from 'vite'

const createDiagnostic: CreateDiagnostic<'eslint'> = (pluginConfig) => {
  let overlay = true // Vite defaults to true
  let currErr: ErrorPayload['err'] | null = null

  return {
    config: async ({ hmr }) => {
      const eslint = new ESLint()
      const diagnostics = await eslint.lintFiles(path.resolve(process.cwd(), 'src/*.ts'))
      const normalized = diagnostics.map((p) => normalizeEslintDiagnostic(p)).flat(1)
      normalized.forEach((n) => {
        console.log(diagnosticToTerminalLog(n))
      })
    },
    configureServer({ root }) {},
  }
}

export class EslintChecker extends Checker<'eslint'> {
  public constructor() {
    super({
      name: 'typescript',
      absFilePath: __filename,
      build: {
        buildBin: (userConfig) => {
          invariant(
            userConfig.eslint.files,
            `eslint.files is required, but got ${userConfig.eslint.files}`
          )
          return ['eslint', ['--ext', userConfig.eslint.ext ?? '.js', userConfig.eslint.files]]
        },
      },
      createDiagnostic,
    })
  }

  public init() {
    const createServeAndBuild = super.initMainThread()
    module.exports.createServeAndBuild = createServeAndBuild

    super.initWorkerThread()
  }
}

const eslintChecker = new EslintChecker()
eslintChecker.prepare()
eslintChecker.init()
