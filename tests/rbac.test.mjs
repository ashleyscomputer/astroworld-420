import {test} from 'node:test';import assert from 'node:assert/strict';import {roles,allowed,isRole} from '../lib/staff-permissions.ts';
test('super admin exclusively manages staff',()=>roles.forEach(r=>assert.equal(allowed(r,'manage_staff'),r==='super_admin')));
test('reception cannot change inventory or members',()=>{assert.equal(allowed('reception','scan'),true);assert.equal(allowed('reception','inventory'),false);assert.equal(allowed('reception','manage_members'),false);});
test('unknown roles denied',()=>{assert.equal(isRole('admin'),false);assert.equal(isRole('manager'),true);});
