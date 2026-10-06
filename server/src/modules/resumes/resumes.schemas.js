import { z } from 'zod';
import { httpUrl, optionalText, paginationQuery, text } from '../../common/validation/index.js';

const links = z
  .object({
    github: httpUrl.nullish(),
    linkedin: httpUrl.nullish(),
    portfolio: httpUrl.nullish(),
    website: httpUrl.nullish(),
  })
  .strict();

const experience = z
  .object({
    company: text(160),
    role: text(160),
    location: optionalText(160),
    startDate: optionalText(40),
    endDate: optionalText(40),
    current: z.boolean().optional(),
    description: optionalText(4000),
  })
  .strict();

const education = z
  .object({
    school: text(160),
    program: optionalText(160),
    year: optionalText(40),
    details: optionalText(2000),
  })
  .strict();

const project = z
  .object({
    name: text(160),
    description: optionalText(2000),
    url: httpUrl.nullish(),
    skills: z.array(text(60)).max(30).optional(),
  })
  .strict();

const certification = z
  .object({
    name: text(160),
    issuer: optionalText(160),
    year: optionalText(40),
  })
  .strict();

const fields = {
  title: text(120),
  template: z.enum(['classic', 'modern', 'minimal', 'technical']).optional(),
  fullName: optionalText(160),
  headline: optionalText(200),
  email: optionalText(200),
  phone: optionalText(40),
  location: optionalText(160),
  links: links.optional(),
  summary: optionalText(4000),
  experience: z.array(experience).max(40).optional(),
  education: z.array(education).max(20).optional(),
  projects: z.array(project).max(40).optional(),
  skills: z.array(text(60)).max(60).optional(),
  certifications: z.array(certification).max(30).optional(),
};

export const listQuery = z.object({ ...paginationQuery });
export const createBody = z.object(fields).strict();
// title stays required on create; on update everything is optional but title (if sent) must be non-empty.
export const updateBody = z.object(fields).partial().strict();
