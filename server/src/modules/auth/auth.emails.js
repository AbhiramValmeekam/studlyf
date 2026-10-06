// Links point at the frontend, which POSTs the token to the API.
export function verificationEmail(config, user, token) {
  const link = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    to: user.email,
    subject: 'Verify your STUDLYF email',
    text: `Hi ${user.name},\n\nConfirm your email address to finish setting up your STUDLYF account:\n${link}\n\nThis link expires in ${Math.round(config.auth.emailVerificationTtlMs / 3_600_000)} hours.`,
  };
}

export function passwordResetEmail(config, user, token) {
  const link = `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to: user.email,
    subject: 'Reset your STUDLYF password',
    text: `Hi ${user.name},\n\nUse this link to choose a new password:\n${link}\n\nIt expires in ${Math.round(config.auth.passwordResetTtlMs / 60_000)} minutes. If you didn't ask for this, you can ignore this email.`,
  };
}
