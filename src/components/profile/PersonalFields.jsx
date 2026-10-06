import { Input, Select, FormField } from '../ui/Field'
import { Chip, Badge } from '../ui/atoms'
import { DEGREE_SUGGESTIONS, GENDERS, INTERESTS, YEARS_OF_STUDY, graduationYears } from '../../lib/profile'

// Field groups shared by the "Complete your profile" prompt and the profile page.
// Each takes the form state, a `set(key, value)` updater and an `errors` map whose
// keys match the API's field paths (e.g. "links.github").

function Req({ children }) {
  return (
    <>
      {children}
      <span className="ml-0.5 text-flare" aria-hidden>
        *
      </span>
    </>
  )
}

const onText = (set, key) => (e) => set(key, e.target.value)

export function BasicFields({ form, set, errors, email, emailVerified, idPrefix = 'p' }) {
  return (
    <div className="space-y-5">
      <FormField label={<Req>Full name</Req>} htmlFor={`${idPrefix}-name`} error={errors.name}>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={onText(set, 'name')}
          error={errors.name}
          autoComplete="name"
          required
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={<Req>Mobile number</Req>} htmlFor={`${idPrefix}-phone`} error={errors.phone}>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={onText(set, 'phone')}
            error={errors.phone}
            placeholder="+91 98765 43210"
            required
          />
        </FormField>
        <FormField label="Email" htmlFor={`${idPrefix}-email`}>
          <div className="relative">
            <Input id={`${idPrefix}-email`} value={email || ''} disabled className="pr-24 opacity-70" />
            <Badge tone={emailVerified ? 'open' : 'soon'} className="absolute right-3 top-1/2 -translate-y-1/2">
              {emailVerified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        </FormField>
      </div>

      <FormField label="City" htmlFor={`${idPrefix}-city`} error={errors.city}>
        <Input
          id={`${idPrefix}-city`}
          value={form.city}
          onChange={onText(set, 'city')}
          error={errors.city}
          autoComplete="address-level2"
          placeholder="Bengaluru"
        />
      </FormField>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-bone/90">
          Gender <span className="font-normal text-mute">— optional, used for eligibility-based programs</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <Chip key={g.value} active={form.gender === g.value} onClick={() => set('gender', form.gender === g.value ? '' : g.value)}>
              {g.label}
            </Chip>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

export function EducationFields({ form, set, errors, idPrefix = 'p' }) {
  const listId = `${idPrefix}-degree-options`
  return (
    <div className="space-y-5">
      <FormField label={<Req>College / University</Req>} htmlFor={`${idPrefix}-college`} error={errors.college}>
        <Input
          id={`${idPrefix}-college`}
          value={form.college}
          onChange={onText(set, 'college')}
          error={errors.college}
          autoComplete="organization"
          placeholder="e.g. Vertex Institute of Technology"
          required
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={<Req>Degree</Req>} htmlFor={`${idPrefix}-degree`} error={errors.degree}>
          <Input
            id={`${idPrefix}-degree`}
            list={listId}
            value={form.degree}
            onChange={onText(set, 'degree')}
            error={errors.degree}
            placeholder="B.Tech"
            required
          />
          <datalist id={listId}>
            {DEGREE_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </FormField>
        <FormField label={<Req>Branch / Specialisation</Req>} htmlFor={`${idPrefix}-branch`} error={errors.branch}>
          <Input
            id={`${idPrefix}-branch`}
            value={form.branch}
            onChange={onText(set, 'branch')}
            error={errors.branch}
            placeholder="Computer Science"
            required
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={<Req>Current year</Req>} htmlFor={`${idPrefix}-year`} error={errors.yearOfStudy}>
          <Select
            id={`${idPrefix}-year`}
            value={form.yearOfStudy}
            onChange={onText(set, 'yearOfStudy')}
            error={errors.yearOfStudy}
            required
          >
            <option value="">Select…</option>
            {YEARS_OF_STUDY.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={<Req>Graduation year</Req>} htmlFor={`${idPrefix}-grad`} error={errors.graduationYear}>
          <Select
            id={`${idPrefix}-grad`}
            value={form.graduationYear}
            onChange={onText(set, 'graduationYear')}
            error={errors.graduationYear}
            required
          >
            <option value="">Select…</option>
            {graduationYears().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
    </div>
  )
}

export function LinksFields({ form, set, errors, idPrefix = 'p', showWebsite = false }) {
  const setLink = (k) => (e) => set('links', { ...form.links, [k]: e.target.value })
  const fields = [
    { key: 'github', label: 'GitHub', placeholder: 'username or github.com/username', hint: 'We link your repos to your profile.' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/your-name' },
    { key: 'portfolio', label: 'Portfolio', placeholder: 'https://…', hint: 'Optional — Behance, Dribbble, a personal site.' },
    ...(showWebsite ? [{ key: 'website', label: 'Website', placeholder: 'https://…' }] : []),
  ]
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((f) => (
        <FormField key={f.key} label={f.label} htmlFor={`${idPrefix}-${f.key}`} error={errors[`links.${f.key}`]} hint={f.hint}>
          <Input
            id={`${idPrefix}-${f.key}`}
            value={form.links[f.key]}
            onChange={setLink(f.key)}
            error={errors[`links.${f.key}`]}
            placeholder={f.placeholder}
            autoCapitalize="off"
            spellCheck={false}
          />
        </FormField>
      ))}
    </div>
  )
}

export function InterestsPicker({ form, set, errors }) {
  const toggle = (v) =>
    set('interests', form.interests.includes(v) ? form.interests.filter((x) => x !== v) : [...form.interests, v])
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-bone/90">
        What are you looking for? <span className="font-normal text-mute">— pick any</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((i) => (
          <Chip key={i.value} active={form.interests.includes(i.value)} onClick={() => toggle(i.value)}>
            {i.label}
          </Chip>
        ))}
      </div>
      {errors.interests && <p className="mt-1.5 text-sm text-flare">{errors.interests}</p>}
    </fieldset>
  )
}
