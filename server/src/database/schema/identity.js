import { Schema } from 'mongoose';
import {
  ADMIN_LEVELS,
  AUTH_TOKEN_PURPOSES,
  GENDERS,
  ONBOARDING_INTENTS,
  PROFILE_INTERESTS,
  ROLES,
  USER_STATUSES,
  YEARS_OF_STUDY,
} from './enums.js';

const { ObjectId } = Schema.Types;

// Spec model "UserRole" → embedded `users.roles[]` (a user's role set is always read with the user).

// Spec model "OnboardingPreference" → embedded `users.onboarding` (one per user, written atomically with roles).

/**
 * Personal + academic profile, collected by the "Complete your profile" prompt and
 * edited on the profile page. It is the single source of truth for college details,
 * city and social links — the builder profile reads these rather than keeping copies,
 * so the account page and the builder profile can never drift apart.
 */
const personalProfileSchema = new Schema(
  {
    gender: { type: String, enum: [...GENDERS, null], default: null },
    city: { type: String, default: null },
    college: { type: String, default: null },
    degree: { type: String, default: null },
    branch: { type: String, default: null },
    yearOfStudy: { type: String, enum: [...YEARS_OF_STUDY, null], default: null },
    graduationYear: { type: Number, default: null },
    links: {
      type: new Schema(
        {
          github: { type: String, default: null },
          linkedin: { type: String, default: null },
          portfolio: { type: String, default: null },
          website: { type: String, default: null },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    interests: { type: [{ type: String, enum: PROFILE_INTERESTS }], default: () => [] },
    /** First time every required field was filled (analytics; completeness itself is computed live). */
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

export const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: null },
    // Never returned unless a query explicitly asks for `+passwordHash`.
    passwordHash: { type: String, required: true, select: false },
    profilePhotoId: { type: ObjectId, ref: 'MediaAsset', default: null },
    primaryRole: { type: String, enum: ROLES, required: true, default: 'USER' },
    roles: {
      type: [
        new Schema(
          {
            role: { type: String, enum: ROLES, required: true },
            grantedAt: { type: Date, required: true, default: () => new Date() },
            grantedBy: { type: ObjectId, ref: 'User', default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    status: { type: String, enum: USER_STATUSES, required: true, default: 'ACTIVE' },
    emailVerified: { type: Boolean, required: true, default: false },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    onboarding: {
      type: new Schema(
        {
          intent: { type: String, enum: ONBOARDING_INTENTS, required: true },
          completedAt: { type: Date, required: true, default: () => new Date() },
        },
        { _id: false },
      ),
      default: null,
    },
    profile: { type: personalProfileSchema, default: () => ({}) },
  },
  { collection: 'users', timestamps: true },
);
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1 });
userSchema.index({ 'roles.role': 1 });
userSchema.index({ createdAt: -1 });

// The single source of truth for admin (staff) access. Kept in its own collection so
// no update to a user document can ever grant admin rights.

export const adminUserSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    level: { type: String, enum: ADMIN_LEVELS, required: true, default: 'EDITOR' },
    active: { type: Boolean, required: true, default: true },
    createdBy: { type: ObjectId, ref: 'User', default: null },
  },
  { collection: 'admin_users', timestamps: true },
);
adminUserSchema.index({ userId: 1 }, { unique: true });

export const sessionSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true, default: () => new Date() },
    revokedAt: { type: Date, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { collection: 'sessions', timestamps: { createdAt: true, updatedAt: false } },
);
sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB deletes expired sessions

export const authTokenSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: AUTH_TOKEN_PURPOSES, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { collection: 'auth_tokens', timestamps: { createdAt: true, updatedAt: false } },
);
authTokenSchema.index({ tokenHash: 1 }, { unique: true });
authTokenSchema.index({ userId: 1, purpose: 1 });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
