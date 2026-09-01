export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  department_id?: string;
  must_change_password: boolean;
  /** True only when the current access token was issued for the forced-password flow. */
  password_change_authorized?: boolean;
}
