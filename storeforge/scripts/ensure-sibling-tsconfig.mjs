/**
 * Build shim for running StoreForge nested inside another project.
 *
 * StoreForge lives in a subdirectory of a repo that has its own
 * `tsconfig.json` with `"extends": "./.nuxt/tsconfig.json"` — a file that only
 * exists after that project has had `nuxt prepare` run in it. Vite's bundler
 * walks up the directory tree looking for TypeScript config, finds that file,
 * cannot resolve what it extends, and fails every `<script lang="ts">`
 * transform in this project. No tsconfig placed inside StoreForge stops the
 * lookup, so the only fix is to make the ancestor resolvable.
 *
 * This writes a minimal stub at the missing path if — and only if — an
 * ancestor tsconfig extends a target that does not exist. It never overwrites
 * an existing file, and it only ever writes into a build directory.
 *
 * Delete this script and its `prebuild`/`predev` hooks once StoreForge is the
 * root of its own repository.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const STUB = {
  compilerOptions: {
    target: 'ESNext',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    strict: true,
    skipLibCheck: true,
  },
}

let dir = resolve(projectRoot, '..')
let previous = ''

while (dir !== previous) {
  const tsconfigPath = resolve(dir, 'tsconfig.json')

  if (existsSync(tsconfigPath)) {
    let extendsPath
    try {
      // Nuxt writes plain JSON here, so a tolerant parse is not needed.
      extendsPath = JSON.parse(readFileSync(tsconfigPath, 'utf8')).extends
    }
    catch {
      extendsPath = undefined
    }

    if (typeof extendsPath === 'string' && extendsPath.startsWith('.')) {
      const target = resolve(dir, extendsPath)
      if (!existsSync(target)) {
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, JSON.stringify(STUB, null, 2) + '\n')
        console.log(`[storeforge] wrote a tsconfig stub at ${target} so the bundler can resolve ${tsconfigPath}`)
      }
    }
  }

  previous = dir
  dir = dirname(dir)
}
