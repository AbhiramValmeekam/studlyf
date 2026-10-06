/**
 * Minimum information a project needs before it can be made PUBLIC/UNLISTED or submitted to an
 * opportunity (spec §5). Returns field-level issues with builder-friendly messages; an empty
 * list means the project is ready. `verb` tailors the wording ("publishing" / "submitting").
 */
const textOf = (html) => (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export function publishIssues(project, verb = 'publishing') {
  const issues = [];
  if (!project.title?.trim()) issues.push({ field: 'title', message: `Give your project a name before ${verb}.` });
  if (!project.tagline?.trim()) issues.push({ field: 'tagline', message: `Add a short description before ${verb}.` });
  if (textOf(project.description).length < 20) {
    issues.push({ field: 'description', message: `Add a full description (at least 20 characters) before ${verb}.` });
  }
  if (!project.projectType) issues.push({ field: 'projectType', message: `Choose a project type before ${verb}.` });
  if (!project.authorUserId) issues.push({ field: 'owner', message: 'A project needs an owner.' });
  if ((project.skills?.length ?? 0) === 0 && (project.technologies?.length ?? 0) === 0) {
    issues.push({ field: 'skills', message: `Add at least one skill before ${verb}.` });
  }
  return issues;
}

export const isReadyToPublish = (project) => publishIssues(project).length === 0;
