import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateBootstrapPassword,isStrongBootstrapPassword} from '../scripts/bootstrap-password.mjs';

test('fresh local passwords are unique and strong', () => {
  const one = generateBootstrapPassword(), two = generateBootstrapPassword();
  assert.notEqual(one,two);
  assert.equal(isStrongBootstrapPassword(one),true);
  assert.equal(isStrongBootstrapPassword(two),true);
  assert.equal(one.includes('\n'),false);
});
test('weak bootstrap passwords are rejected',()=>{
  for(const value of ['admin','', 'short', '123456789012345'])assert.equal(isStrongBootstrapPassword(value),false);
});
