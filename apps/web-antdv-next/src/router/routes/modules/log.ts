import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:logs',
      order: 2004,
      title: $t('log.title'),
    },
    name: 'Log',
    path: '/log',
    children: [
      {
        name: 'LogLoginLog',
        path: 'login-log',
        component: () => import('#/views/log/login-log/index.vue'),
        meta: {
          icon: 'lucide:user-lock',
          order: 1,
          title: $t('log.loginLog.title'),
        },
      },
    ],
  },
];

export default routes;
