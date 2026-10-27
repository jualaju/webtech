import type { Hackathon } from './types';
export const money = (n: number) => '₹' + new Intl.NumberFormat('en-IN').format(n);
export const date = (value: string) =>
  new Date(value + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const isRegistrationOpen = (event: Hackathon) =>
  new Date(event.deadline + 'T23:59:59Z') >= new Date() && event.registrations < event.capacity;
