import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { content } from '../src/content'

const missingAssets: string[] = []
for (const exercise of content.exercises) {
  for (const image of exercise.postureImages) {
    try {
      await access(resolve('public', image.path.replace(/^\//, '')))
    } catch {
      missingAssets.push(`${exercise.id}: ${image.path}`)
    }
  }
}

if (missingAssets.length > 0) {
  throw new Error(`Missing posture assets:\n${missingAssets.join('\n')}`)
}

console.log(
  `Validated ${content.exercises.length} exercises, ${content.sequences.length} sequences, policy ${content.policy.version}, and all local posture assets.`,
)
