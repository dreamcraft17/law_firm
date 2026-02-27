import { describe, it, expect } from 'vitest';
import { adminEndpoints, ApiPaths } from './api-paths';

describe('api-paths', () => {
  describe('adminEndpoints', () => {
    it('authLogin returns admin/auth/login path', () => {
      expect(adminEndpoints.authLogin()).toBe('admin/auth/login');
    });

    it('userDetail returns path with id', () => {
      expect(adminEndpoints.userDetail('uuid-123')).toBe('admin/users/uuid-123');
    });

    it('casesList returns base path when no params', () => {
      expect(adminEndpoints.casesList()).toBe(ApiPaths.cases);
    });

    it('casesList appends query when params given', () => {
      const result = adminEndpoints.casesList({ stage: 'active', clientId: 'c1' });
      expect(result).toContain('admin/cases');
      expect(result).toContain('stage=active');
      expect(result).toContain('clientId=c1');
    });

    it('clientCheckDuplicates builds query string', () => {
      expect(adminEndpoints.clientCheckDuplicates({ name: 'Acme' })).toBe(
        'admin/clients/check-duplicates?name=Acme'
      );
      const multi = adminEndpoints.clientCheckDuplicates({ email: 'a@b.com', npwp: '123' });
      expect(multi).toContain('check-duplicates');
      expect(multi).toContain('email=');
      expect(multi).toContain('npwp=');
    });

    it('rolePermissions returns path with role id', () => {
      expect(adminEndpoints.rolePermissions('r1')).toBe('admin/roles/r1/permissions');
    });

    it('leadConvert returns path with lead id', () => {
      expect(adminEndpoints.leadConvert('lead-1')).toBe('admin/leads/lead-1/convert');
    });
  });
});
