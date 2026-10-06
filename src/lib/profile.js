// Shared vocabulary for the personal profile — used by the "Complete your profile"
// prompt and the profile page so both always offer the same choices. Values mirror
// the server enums (server/src/database/schema/enums.js).

export const GENDERS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]

export const YEARS_OF_STUDY = [
  { value: '1', label: '1st year' },
  { value: '2', label: '2nd year' },
  { value: '3', label: '3rd year' },
  { value: '4', label: '4th year' },
  { value: '5', label: '5th year' },
  { value: 'GRADUATED', label: 'Graduated' },
]

// Suggestions only — the degree field is free text so nobody is blocked.
export const DEGREE_SUGGESTIONS = [
  'B.Tech', 'B.E.', 'B.Sc', 'BCA', 'B.Com', 'BBA', 'B.Des', 'B.A.',
  'M.Tech', 'M.E.', 'M.Sc', 'MCA', 'MBA', 'M.Des', 'Diploma', 'Ph.D',
]

export const INTERESTS = [
  { value: 'INTERNSHIPS', label: 'Internships' },
  { value: 'JOBS', label: 'Jobs' },
  { value: 'HACKATHONS', label: 'Hackathons' },
  { value: 'COMPETITIONS', label: 'Competitions' },
  { value: 'PROJECTS', label: 'Real-world projects' },
  { value: 'MENTORSHIP', label: 'Mentorship' },
  { value: 'COURSES', label: 'Courses & upskilling' },
  { value: 'STARTUPS', label: 'Building a startup' },
]

export function graduationYears() {
  const now = new Date().getFullYear()
  const years = []
  for (let y = now + 6; y >= now - 15; y--) years.push(y)
  return years
}

// Human labels for the completion checklist keys returned by the API.
export const MISSING_LABELS = {
  phone: 'Mobile number',
  education: 'College details',
  links: 'GitHub / LinkedIn',
  location: 'City',
  interests: 'What you’re looking for',
  photo: 'Profile photo',
  headline: 'Headline',
  bio: 'Bio',
  skills: '3+ skills',
  availability: 'Availability',
}

export const REQUIRED_LABELS = {
  name: 'Full name',
  phone: 'Mobile number',
  college: 'College',
  degree: 'Degree',
  branch: 'Branch',
  yearOfStudy: 'Current year',
  graduationYear: 'Graduation year',
}

/** Server `details[]` → { field: message } (nested fields keep their dotted path). */
export function detailsToErrors(err) {
  return Object.fromEntries((err?.details || []).map((d) => [d.field, d.message]))
}

/** Profile form state from the `me.profile` payload (nulls → '' for inputs). */
export function toPersonalForm(user) {
  const p = user?.profile || {}
  return {
    name: user?.name || '',
    phone: user?.phone || '',
    gender: p.gender || '',
    city: p.city || '',
    college: p.college || '',
    degree: p.degree || '',
    branch: p.branch || '',
    yearOfStudy: p.yearOfStudy || '',
    graduationYear: p.graduationYear ? String(p.graduationYear) : '',
    links: {
      github: p.links?.github || '',
      linkedin: p.links?.linkedin || '',
      portfolio: p.links?.portfolio || '',
      website: p.links?.website || '',
    },
    interests: p.interests || [],
  }
}

/** Build a PATCH body for the given form keys ('' → null so fields can be cleared). */
export function personalPayload(form, keys) {
  const out = {}
  for (const k of keys) {
    if (k === 'links') {
      out.links = Object.fromEntries(Object.entries(form.links).map(([lk, v]) => [lk, v.trim() || null]))
    } else if (k === 'interests') {
      out.interests = form.interests
    } else if (k === 'graduationYear') {
      out.graduationYear = form.graduationYear ? Number(form.graduationYear) : null
    } else if (k === 'name') {
      out.name = form.name.trim()
    } else {
      const v = typeof form[k] === 'string' ? form[k].trim() : form[k]
      out[k] = v === '' ? null : v
    }
  }
  return out
}
