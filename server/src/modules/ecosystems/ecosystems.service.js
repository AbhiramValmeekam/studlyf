import { AppError } from '../../common/errors/app-error.js';

/**
 * The single source of truth for "which STUDLYF ecosystems can this account use, and where should
 * each one send them". The frontend's post-login resolver only chooses BETWEEN these states (by the
 * intended ecosystem, or by asking) — it never decides access itself, and a `?role=` query string
 * is only ever a hint about where the visitor was heading.
 *
 * Status per ecosystem:
 *   NONE        — never entered; `destination` is where to start (onboarding / access request)
 *   ONBOARDING  — started but not finished (founder without a completed profile)
 *   PENDING     — access request / organization awaiting STUDLYF verification
 *   ACTIVE      — full access; `destination` is the ecosystem dashboard
 *   REJECTED    — request declined (`statusNote` explains; the person may resubmit)
 *   SUSPENDED   — access withdrawn; dashboards and APIs are blocked
 */
export const ECOSYSTEM_PATHS = {
  BUILDER: { landing: '/builders', home: '/builders/dashboard', start: '/builders/onboarding', status: '/builders/onboarding' },
  FOUNDER: { landing: '/founders', home: '/founders/dashboard', start: '/founders/onboarding', status: '/founders/onboarding' },
  INVESTOR: {
    landing: '/investors',
    home: '/investors/dashboard',
    start: '/investors/access-request',
    status: '/investors/access-request/status',
  },
  HR: { landing: '/hr', home: '/hr/dashboard', start: '/hr/verification', status: '/hr/verification' },
  ORGANIZER: {
    landing: '/organizations',
    home: '/organizations/dashboard',
    start: '/organizations/onboarding',
    status: '/organizations/onboarding',
  },
};

const hasRole = (user, role) => (user?.roles ?? []).some((r) => r.role === role);

function state(ecosystem, status, extra = {}) {
  const paths = ECOSYSTEM_PATHS[ecosystem];
  const destination = status === 'ACTIVE' ? paths.home : status === 'NONE' ? paths.start : paths.status;
  return { ecosystem, status, active: status === 'ACTIVE', destination, statusNote: null, ...extra };
}

/** Organizations the user belongs to, with the organization row attached (most relevant first). */
export async function membershipsOf(db, userId) {
  const members = await db.OrganizationMember.find({ userId }).sort({ createdAt: 1 }).lean();
  if (!members.length) return [];
  const orgs = await db.Organization.find({ _id: { $in: members.map((m) => m.organizationId) } }).lean();
  const byId = new Map(orgs.map((o) => [String(o._id), o]));
  const rank = { ACTIVE: 0, PENDING: 1, REJECTED: 2, SUSPENDED: 3 };
  return members
    .map((m) => ({ membership: m, organization: byId.get(String(m.organizationId)) }))
    .filter((x) => x.organization)
    .sort((a, b) => rank[a.organization.status] - rank[b.organization.status]);
}

/** Every ecosystem's state for one account — six small indexed reads, run in parallel. */
export async function ecosystemStates(db, userId) {
  const [user, builder, founder, investor, hr, memberships] = await Promise.all([
    db.User.findById(userId).select({ roles: 1 }).lean(),
    db.BuilderProfile.exists({ userId }),
    db.FounderProfile.findOne({ userId }).select({ onboardingCompletedAt: 1 }).lean(),
    db.InvestorProfile.findOne({ userId }).select({ status: 1, statusNote: 1 }).lean(),
    db.HrProfile.findOne({ userId }).select({ status: 1, statusNote: 1 }).lean(),
    membershipsOf(db, userId),
  ]);

  const founderDone = !!founder?.onboardingCompletedAt && hasRole(user, 'FOUNDER');
  const org = memberships[0];
  return {
    BUILDER: hasRole(user, 'BUILDER') ? state('BUILDER', 'ACTIVE', { onboarded: !!builder }) : state('BUILDER', 'NONE'),
    FOUNDER: founderDone
      ? state('FOUNDER', 'ACTIVE')
      : founder || hasRole(user, 'FOUNDER')
        ? state('FOUNDER', 'ONBOARDING')
        : state('FOUNDER', 'NONE'),
    INVESTOR: investor ? state('INVESTOR', investor.status, { statusNote: investor.statusNote ?? null }) : state('INVESTOR', 'NONE'),
    HR: hr ? state('HR', hr.status, { statusNote: hr.statusNote ?? null }) : state('HR', 'NONE'),
    ORGANIZER: org
      ? state('ORGANIZER', org.organization.status, {
          statusNote: org.organization.statusNote ?? null,
          organization: { id: String(org.organization._id), name: org.organization.name, role: org.membership.role },
        })
      : state('ORGANIZER', 'NONE'),
  };
}

// ---- server-side RBAC ------------------------------------------------------------

const DENIED = {
  NONE: {
    BUILDER: 'Builder access required — join the Builder ecosystem first.',
    FOUNDER: 'Founder access required — complete founder onboarding first.',
    INVESTOR: 'Investor access required — request investor access first.',
    HR: 'HR access required — complete HR verification first.',
    ORGANIZER: 'Organization access required — create or join a verified organization first.',
  },
  ONBOARDING: 'Finish onboarding to use this ecosystem.',
  PENDING: 'Your access request is still being verified.',
  REJECTED: 'Your access request was not approved.',
  SUSPENDED: 'Access to this ecosystem has been suspended.',
};

/**
 * Resolve what the caller may do in `ecosystem`, straight from the database. Returns the context
 * a handler needs (the active organization for ORGANIZER, the profile for INVESTOR/HR/FOUNDER) or
 * throws 403 with a state-specific message. Nothing from the client is trusted.
 */
export async function ecosystemContext(db, userId, ecosystem) {
  const deny = (status) => {
    const message = status === 'NONE' ? DENIED.NONE[ecosystem] : DENIED[status];
    return new AppError('FORBIDDEN', message, [{ field: 'ecosystem', message: `${ecosystem}:${status}` }]);
  };
  switch (ecosystem) {
    case 'BUILDER': {
      if (!(await db.User.exists({ _id: userId, 'roles.role': 'BUILDER' }))) throw deny('NONE');
      return {};
    }
    case 'FOUNDER': {
      const [role, profile] = await Promise.all([
        db.User.exists({ _id: userId, 'roles.role': 'FOUNDER' }),
        db.FounderProfile.findOne({ userId }).lean(),
      ]);
      if (!role && !profile) throw deny('NONE');
      if (!role || !profile?.onboardingCompletedAt) throw deny('ONBOARDING');
      return { profile };
    }
    case 'INVESTOR':
    case 'HR': {
      const model = ecosystem === 'INVESTOR' ? db.InvestorProfile : db.HrProfile;
      const profile = await model.findOne({ userId }).lean();
      if (!profile) throw deny('NONE');
      if (profile.status !== 'ACTIVE') throw deny(profile.status);
      return { profile };
    }
    case 'ORGANIZER': {
      const [first] = await membershipsOf(db, userId);
      if (!first) throw deny('NONE');
      if (first.organization.status !== 'ACTIVE') throw deny(first.organization.status);
      return { organization: first.organization, membership: first.membership };
    }
    default:
      throw AppError.forbidden('Unknown ecosystem');
  }
}

/** Route guard: `r.use('/hr/talent', requireEcosystem(db, 'HR'))`. Sets `req.ecosystem`. */
export function requireEcosystem(db, ecosystem) {
  return async (req, _res, next) => {
    try {
      if (!req.auth) throw AppError.unauthenticated();
      if (req.auth.user.status !== 'ACTIVE') throw new AppError('ACCOUNT_DISABLED', 'This account is not active');
      req.ecosystem = await ecosystemContext(db, req.auth.user.id, ecosystem);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Keep `users.roles[]` in step with verified access (roles are what admin filters and reports use). */
export async function syncRole(db, userId, role, granted, actorId = null) {
  if (granted) {
    await db.User.updateOne(
      { _id: userId, 'roles.role': { $ne: role } },
      { $push: { roles: { role, grantedAt: new Date(), grantedBy: actorId } } },
    );
  } else {
    await db.User.updateOne({ _id: userId }, { $pull: { roles: { role } } });
  }
}
