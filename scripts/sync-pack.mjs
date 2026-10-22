// Copies the generated pack and the article source into public/ so Vite serves and ships them.
import { cpSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
if (!existsSync(join(root, 'pack', 'manifest-Cursor.json'))) {
  console.error('pack/ is missing. Run: python3 generator/basement_protocol.py')
  process.exit(1)
}
for (const dir of ['pack', 'article']) {
  const dest = join(root, 'public', dir)
  rmSync(dest, { recursive: true, force: true })
  cpSync(join(root, dir), dest, { recursive: true })
  console.log(`synced ${dir}/ -> public/${dir}/`)
}
