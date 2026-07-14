/** Main section list routes — show Home instead of Back. */
const MAIN_SECTION_PATHS = new Set([
  '/',
  '/customers',
  '/tickets',
  '/orders',
  '/invoices',
  '/purchasing',
  '/items',
  '/admin',
]);

export type MobileNavTarget =
  | { kind: 'none' }
  | { kind: 'home'; to: '/'; label: string }
  | { kind: 'back'; to: string; label: string };

/**
 * Mobile top-bar nav: Home on main section pages, Back on nested pages.
 */
export function getMobileNavTarget(pathname: string): MobileNavTarget {
  if (pathname === '/') return { kind: 'none' };

  if (MAIN_SECTION_PATHS.has(pathname)) {
    return { kind: 'home', to: '/', label: 'Home' };
  }

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { kind: 'home', to: '/', label: 'Home' };

  const last = parts[parts.length - 1];
  const isLeafAction =
    last === 'new' ||
    last === 'edit' ||
    last === 'billing' ||
    last === 'payment-history' ||
    last === 'bill-order' ||
    last === 'users';

  let parent: string;
  if (isLeafAction && parts.length >= 2) {
    parent = '/' + parts.slice(0, -1).join('/');
    // /admin/users/new → /admin
    if (parent === '/admin/users') parent = '/admin';
  } else if (parts.length >= 2 && /^\d+$/.test(last)) {
    parent = '/' + parts[0];
  } else {
    parent = '/' + parts[0];
  }

  const labelByRoot: Record<string, string> = {
    customers: 'Customers',
    tickets: 'Tickets',
    orders: 'Orders',
    invoices: 'Invoices',
    purchasing: 'Purchasing',
    items: 'Items',
    admin: 'Admin',
  };

  const root = parts[0];
  const label =
    parent.split('/').filter(Boolean).length > 1
      ? 'Back'
      : `Back to ${labelByRoot[root] ?? 'list'}`;

  return { kind: 'back', to: parent || '/', label };
}

export function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/customers') return 'Customers';
  if (pathname === '/customers/new') return 'New Customer';
  if (/^\/customers\/\d+\/payment-history$/.test(pathname)) return 'Payment history';
  if (/^\/customers\/\d+$/.test(pathname)) return 'Customer';
  if (pathname === '/tickets') return 'Tickets';
  if (pathname === '/tickets/new') return 'New Ticket';
  if (/^\/tickets\/\d+\/edit$/.test(pathname)) return 'Edit Ticket';
  if (/^\/tickets\/\d+$/.test(pathname)) return 'Ticket';
  if (pathname === '/orders') return 'Orders';
  if (pathname === '/orders/new') return 'New Order';
  if (/^\/orders\/\d+\/billing$/.test(pathname)) return 'Billing';
  if (/^\/orders\/\d+$/.test(pathname)) return 'Order';
  if (pathname === '/invoices') return 'Invoices';
  if (pathname === '/invoices/bill-order') return 'Bill an order';
  if (/^\/invoices\/\d+$/.test(pathname)) return 'Invoice';
  if (pathname === '/items') return 'Items';
  if (pathname === '/items/new') return 'New Item';
  if (/^\/items\/\d+\/edit$/.test(pathname)) return 'Edit Item';
  if (/^\/items\/\d+$/.test(pathname)) return 'Item';
  if (pathname === '/admin') return 'Admin';
  if (pathname === '/admin/users/new') return 'Create User';
  if (pathname === '/purchasing') return 'Purchasing';
  if (/^\/purchasing\/\d+$/.test(pathname)) return 'Purchase Order';
  return 'Andy Bot';
}
