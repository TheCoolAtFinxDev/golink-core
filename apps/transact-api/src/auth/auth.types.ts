export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  permissions: string[];
  permissionsRequiring4Eyes: string[];
  merchantIds: string[];
}
