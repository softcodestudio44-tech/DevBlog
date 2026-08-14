export const ADMIN_EMAIL = 'softcodestudio44@gmail.com';

// Keep the legacy typo'd email as a fallback so existing admin
// accounts created with it don't lose admin powers.
const LEGACY_ADMIN_EMAIL = 'sofcodestudio44@gmail.com';

export const ADMIN_EMAILS = [ADMIN_EMAIL, LEGACY_ADMIN_EMAIL];

export const isAdminUser = (user) =>
  !!user && (ADMIN_EMAILS.includes(user?.email) || user?.role === 'admin');

export const isAdminEmail = (email) => !!email && ADMIN_EMAILS.includes(email);

export default isAdminUser;
