import { PrismaClient } from '@prisma/client'
import { encrypt, decrypt } from '@/lib/encryption'

// Fields in UserSettingsRecord that must be auto-encrypted on write and decrypted on read
const ENCRYPTED_FIELDS = [
  'llmApiKey',
  'jiraApiToken',
  'slackBotToken',
  'confluenceApiToken',
  'smtpPassword',
  'zoomClientSecret',
  'teamsClientSecret',
  'notionAccessToken',
  'linearApiKey',
  'githubAccessToken',
  'mixpanelSecret',
  'amplitudeApiKey',
  'ga4CredentialsJson',
]

function isEncrypted(value: string): boolean {
  // Encrypted format: iv:authTag:encrypted (3 colon-separated hex segments)
  const parts = value.split(':')
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p))
}

function encryptFields(data: Record<string, unknown>): void {
  for (const field of ENCRYPTED_FIELDS) {
    const val = data[field]
    if (typeof val === 'string' && val !== '' && !isEncrypted(val)) {
      data[field] = encrypt(val)
    }
  }
}

function decryptFields(row: Record<string, unknown>): void {
  for (const field of ENCRYPTED_FIELDS) {
    const val = row[field]
    if (typeof val === 'string' && val !== '' && isEncrypted(val)) {
      try {
        row[field] = decrypt(val)
      } catch {
        // Leave as-is if decryption fails (corrupted or plaintext)
      }
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedClient> | undefined
}

function createExtendedClient() {
  const base = new PrismaClient()

  return base.$extends({
    query: {
      userSettingsRecord: {
        async create({ args, query }) {
          if (args.data) encryptFields(args.data as Record<string, unknown>)
          const result = await query(args)
          if (result) decryptFields(result as unknown as Record<string, unknown>)
          return result
        },
        async update({ args, query }) {
          if (args.data) encryptFields(args.data as Record<string, unknown>)
          const result = await query(args)
          if (result) decryptFields(result as unknown as Record<string, unknown>)
          return result
        },
        async upsert({ args, query }) {
          if (args.create) encryptFields(args.create as Record<string, unknown>)
          if (args.update) encryptFields(args.update as Record<string, unknown>)
          const result = await query(args)
          if (result) decryptFields(result as unknown as Record<string, unknown>)
          return result
        },
        async findUnique({ args, query }) {
          const result = await query(args)
          if (result) decryptFields(result as unknown as Record<string, unknown>)
          return result
        },
        async findFirst({ args, query }) {
          const result = await query(args)
          if (result) decryptFields(result as unknown as Record<string, unknown>)
          return result
        },
        async findMany({ args, query }) {
          const results = await query(args)
          for (const row of results) {
            decryptFields(row as unknown as Record<string, unknown>)
          }
          return results
        },
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createExtendedClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
