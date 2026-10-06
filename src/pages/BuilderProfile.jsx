import { useParams } from 'react-router-dom'
import { usePublicBuilder, useAuthorProjects } from '../lib/queries'
import { Spinner } from '../components/ui/atoms'
import { portfolioTemplate } from '../components/portfolio/registry'
import { portfolioData } from '../components/portfolio/parts'
import { NotFoundInline } from './NotFound'

export default function BuilderProfile() {
  const { username } = useParams()
  const { data: profile, isLoading, isError, error } = usePublicBuilder(username)
  // The builder's published showcase projects turn this page into a portfolio.
  const { data: projects } = useAuthorProjects(profile ? username : undefined)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError && error?.status === 404) return <NotFoundInline kind="builder" backTo="/opportunities" />
  if (isError || !profile) return <NotFoundInline kind="builder" backTo="/opportunities" />

  // The chosen layout is data-driven — pick the template component and hand every
  // variant the same derived shape (links + merged education).
  const Template = portfolioTemplate(profile.template)
  const { links, education } = portfolioData(profile)

  return <Template profile={profile} projects={projects} education={education} links={links} />
}
