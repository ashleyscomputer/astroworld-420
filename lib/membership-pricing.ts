export type MembershipPlan = 'day' | 'monthly';
export type LoungeAccessChoice = 'none' | MembershipPlan;

export const membershipPricing = {
  day: { label: 'Daily pass', fee: 20, duration: '24 hours' },
  monthly: { label: 'Monthly membership', fee: 100, duration: '1 month' },
} as const;

export function membershipFeeCents(plan: MembershipPlan) {
  return Math.round(membershipPricing[plan].fee * 100);
}
