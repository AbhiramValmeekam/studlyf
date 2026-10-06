import { Schema } from 'mongoose';

const { ObjectId } = Schema.Types;

const experienceSchema = new Schema(
  {
    company: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String, default: null },
    startDate: { type: String, default: null }, // free-form, e.g. "Jan 2023"
    endDate: { type: String, default: null },
    current: { type: Boolean, default: false },
    description: { type: String, default: null },
  },
  { _id: false },
);

const educationSchema = new Schema(
  {
    school: { type: String, required: true },
    program: { type: String, default: null },
    year: { type: String, default: null },
    details: { type: String, default: null },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    url: { type: String, default: null },
    skills: { type: [String], default: [] },
  },
  { _id: false },
);

const certificationSchema = new Schema(
  {
    name: { type: String, required: true },
    issuer: { type: String, default: null },
    year: { type: String, default: null },
  },
  { _id: false },
);

/**
 * A user-owned resume from the Resume Builder. Unlike the admin-published content
 * catalogs, resumes belong to a single user (`userId`) and never appear publicly —
 * every route filters by owner. A user may keep several named resumes (e.g. one per
 * target role). Contents are plain text (no rich HTML) and are the user's own data.
 */
export const resumeSchema = new Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    title: { type: String, required: true }, // internal label, e.g. "Frontend Engineer"
    template: { type: String, default: 'classic' }, // visual layout id (validated at the Zod layer)
    fullName: { type: String, default: null },
    headline: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    location: { type: String, default: null },
    links: {
      github: { type: String, default: null },
      linkedin: { type: String, default: null },
      portfolio: { type: String, default: null },
      website: { type: String, default: null },
    },
    summary: { type: String, default: null },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    skills: { type: [String], default: [] },
    certifications: { type: [certificationSchema], default: [] },
  },
  { collection: 'resumes', timestamps: true },
);
resumeSchema.index({ userId: 1, updatedAt: -1 });
