import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { content } from '../src/content'

const missingAssets: string[] = []
for (const exercise of content.exercises) {
  try {
    await access(resolve('public', exercise.illustrationPath.replace(/^\//, '')))
  } catch {
    missingAssets.push(`${exercise.id}: ${exercise.illustrationPath}`)
  }
}

if (missingAssets.length > 0) {
  throw new Error(`Missing illustration assets:\n${missingAssets.join('\n')}`)
}

console.log(
  `Validated ${content.exercises.length} exercises, ${content.sequences.length} sequences, policy ${content.policy.version}, and all local assets.`,
)
