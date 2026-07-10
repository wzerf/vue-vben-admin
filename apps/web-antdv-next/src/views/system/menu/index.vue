<script lang="ts" setup>
import type { SysMenu } from '#/api/system/menu';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message, Popconfirm, Space, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchMenuListApi } from '#/api/system/menu';
import { useDeleteMenu } from '#/api/system/menu/hooks';
import {
  buildMenuTree,
  MENU_TYPE_TAG,
  useMenuColumns,
  useMenuSearchSchema,
} from '#/views/system/menu/data';
import MenuForm from '#/views/system/menu/modules/form.vue';

defineOptions({ name: 'SystemMenu' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: MenuForm,
  destroyOnClose: true,
});

// 编辑态传递给抽屉的数据
const drawerData = ref<{
  mode: 'create' | 'edit';
  presetParentId?: null | number;
  row?: SysMenu;
}>({ mode: 'create' });

const treeData = ref<Array<SysMenu & { children?: SysMenu[] }>>([]);
const total = ref(0);

async function loadTree(formValues: Record<string, any> = {}) {
  const res = await fetchMenuListApi({
    page: 1,
    pageSize: 100,
    name: formValues.name || undefined,
    type: formValues.type || undefined,
    permissionCode: formValues.permissionCode || undefined,
    status: formValues.status ?? undefined,
  });
  treeData.value = buildMenuTree(res.items);
  total.value = res.total;
}

const deleteMut = useDeleteMenu({
  onSuccess: () => {
    message.success('删除成功');
    gridApi.query();
  },
  onError: (err: Error) =>
    message.error(`删除失败：${err.message ?? '未知错误'}`),
});

const [Grid, gridApi] = useVbenVxeGrid<SysMenu>({
  formOptions: {
    collapsed: false,
    schema: useMenuSearchSchema(),
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useMenuColumns(),
    keepSource: true,
    rowConfig: { isHover: true },
    size: 'small',
    stripe: true,
    treeConfig: {
      transform: false,
      expandAll: true,
    },
    toolbarConfig: {
      custom: true,
      refresh: true,
      zoom: true,
    },
    proxyConfig: {
      ajax: {
        query: async (_params: unknown, formValues: Record<string, any>) => {
          await loadTree(formValues);
          return { items: treeData.value, total: total.value };
        },
      },
    },
  } as never,
});

function openCreate(parentId: null | number = null) {
  drawerData.value = { mode: 'create', presetParentId: parentId };
  formDrawerApi.setData(drawerData.value).open();
}

function openEdit(row: SysMenu) {
  drawerData.value = { mode: 'edit', row };
  formDrawerApi.setData(drawerData.value).open();
}
</script>

<template>
  <Page>
    <Grid>
      <template #toolbar-actions>
        <Button type="primary" @click="openCreate(null)"> + 新增菜单 </Button>
      </template>
      <template #action="{ row }">
        <Space>
          <a @click="openEdit(row)">编辑</a>
          <a v-if="row.type !== 'BUTTON'" @click="openCreate(row.id)">添加子项</a>
          <Popconfirm title="确认删除" @confirm="deleteMut.mutate(row.id)">
            <a style="color: #ff4d4f">删除</a>
          </Popconfirm>
        </Space>
      </template>
      <template #type="{ row }">
        <Tag :color="MENU_TYPE_TAG[row.type]">{{ row.type }}</Tag>
      </template>
      <template #isEnabled="{ row }">
        <Tag :color="row.isEnabled === 1 ? 'success' : 'default'">
          {{ row.isEnabled === 1 ? '启用' : '禁用' }}
        </Tag>
      </template>
    </Grid>
    <FormDrawer @success="gridApi.query()" />
  </Page>
</template>
