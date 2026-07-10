import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 2005,
      title: $t('system.title'),
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'SystemDict',
        path: 'dict',
        component: () => import('#/views/system/dict/index.vue'),
        meta: {
          icon: 'lucide:book-marked',
          title: $t('system.dict.title'),
        },
      },
      {
        name: 'SystemI18n',
        path: 'i18n',
        component: () => import('#/views/system/i18n/index.vue'),
        meta: {
          icon: 'lucide:languages',
          title: $t('system.i18n.title'),
        },
      },
      {
        name: 'SystemMenu',
        path: 'menu',
        component: () => import('#/views/system/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: $t('system.menu.title'),
        },
      },
      {
        name: 'SystemApi',
        path: 'api',
        component: () => import('#/views/system/api/index.vue'),
        meta: {
          icon: 'lucide:terminal',
          title: $t('system.api.title'),
        },
      },
    ],
  },
];

export default routes;
