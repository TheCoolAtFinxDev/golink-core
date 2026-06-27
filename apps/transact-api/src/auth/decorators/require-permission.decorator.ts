import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../permissions.constants';

export const REQUIRED_PERMISSION_KEY = 'required_permission';

export const RequirePermission = (code: PermissionCode) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, code);
