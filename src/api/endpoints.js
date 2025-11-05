// simpat-web/src/api/endpoints.js
export const API = {
  schedules: {
    base: '/api/production-schedules',
    create: () => '/api/production-schedules',
    detail: (id) => `/api/production-schedules/${id}`,
    list: (q) => `/api/production-schedules?${new URLSearchParams(q)}`
  },
  customers: {
    activeMinimal: '/api/customers/active-minimal'
  }
};
