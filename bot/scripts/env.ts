export function required(name: string): string {
  const value = process.env[name]
  if (value) return value
  console.error(`Set ${name} in .env first`)
  process.exit(1)
}
