/**
 * Creates (or promotes) an admin account. Usage:
 *   ADMIN_EMAIL=a@b.com ADMIN_NAME="Jane" ADMIN_PASSWORD='…' [ADMIN_LEVEL=SUPER_ADMIN|EDITOR] npm run admin:create
 * Promoting an existing user leaves their password unchanged.
 */
import { z } from 'zod';
import { loadConfig } from '../config/index.js';
import { hashPassword } from '../common/auth/password.js';
import { createDatabase } from './client.js';
import { ADMIN_LEVELS } from './schema/index.js';
import { emailSchema, passwordSchema } from '../modules/auth/auth.schemas.js';

const input = z
  .object({
    ADMIN_EMAIL: emailSchema,
    ADMIN_NAME: z.string().trim().min(1).max(100).default('STUDLYF Admin'),
    ADMIN_PASSWORD: passwordSchema.optional(),
    ADMIN_LEVEL: z.enum(ADMIN_LEVELS).default('SUPER_ADMIN'),
  })
  .parse(process.env);

const config = loadConfig();
const handle = await createDatabase(config.databaseUrl, { dbName: config.databaseName });
const { db } = handle;
try {
  await handle.migrate();
  let userId = (await db.User.findOne({ email: input.ADMIN_EMAIL }).select({ _id: 1 }).lean())?._id;
  if (!userId) {
    if (!input.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD is required to create a new account');
    const created = await db.User.create({
      name: input.ADMIN_NAME,
      email: input.ADMIN_EMAIL,
      passwordHash: await hashPassword(input.ADMIN_PASSWORD, config.auth.passwordHashCost),
      primaryRole: 'ADMIN',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    userId = created._id;
  }
  await db.User.updateOne({ _id: userId, 'roles.role': { $ne: 'ADMIN' } }, { $push: { roles: { role: 'ADMIN', grantedAt: new Date() } } });
  await db.AdminUser.updateOne(
    { userId },
    { $set: { level: input.ADMIN_LEVEL, active: true } },
    { upsert: true },
  );
  console.log(`${input.ADMIN_EMAIL} is now an active ${input.ADMIN_LEVEL}.`);
} finally {
  await handle.close();
}
