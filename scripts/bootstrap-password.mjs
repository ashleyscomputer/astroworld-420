import {randomBytes} from 'node:crypto';

// This is only used for initial localhost commissioning. Never log the password.
export function generateBootstrapPassword() {
  return randomBytes(24).toString('base64url');
}
export function isStrongBootstrapPassword(value) {
  return typeof value === 'string' && value.length >= 16 && value.length <= 128 && value !== 'admin';
}
