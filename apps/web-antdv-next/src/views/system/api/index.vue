<script lang="ts" setup>
import type { SysApi } from '#/api/system/api';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, message, Popconfirm, Space, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchApiListApi } from '#/api/system/api';
import { useDeleteApi, useSyncApisApi } from '#/api/system/api/hooks';
import {
  METHOD_COLOR,
  useApiColumns,
  useApiSearchSchema,
} from '#/views/system/api/data';
import ApiForm from '#/views/system/api/modules/form.vue';

defineOptions({ name: 'SystemApi' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: ApiForm,
  destroyOnClose: true,
});

const drawerData = ref<{ row?: SysApi }>({});
const syncLoading = ref(false);

const deleteMut = useDeleteApi({
  onSuccess: () => {
    message.success('删除成功');
    gridApi.query();
  },
  onError: (err: Error) =>
    message.error(`删除失败：${err.message ?? '未知错误'}`),
});

const syncMut = useSyncApisApi({
  onSuccess: (res) => {
    message.success(
      `同步成功：新增 ${res.added}，跳过 ${res.skipped}，共 ${res.total}`,
    );
    gridApi.query();
  },
  onError: (err: Error) =>
    message.error(`同步失败：${err.message ?? '未知错误'}`),
  onSettled: () => {
    syncLoading.value = false;
  },
});

async function handleSync() {
  syncLoading.value = true;
  await syncMut.mutate();
}

const [Grid, gridApi] = useVbenVxeGrid<SysApi>({
  formOptions: {
    collapsed: false,
    schema: useApiSearchSchema(),
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useApiColumns(),
    keepSource: true,
    rowConfig: { isHover: true },
    size: 'small',
    stripe: true,
    toolbarConfig: {
      custom: true,
      refresh: true,
      zoom: true,
    },
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          return await fetchApiListApi({
            page: page.currentPage,
            pageSize: page.pageSize,
            name: formValues.name || undefined,
            path: formValues.path || undefined,
            method: formValues.method || undefined,
            group: formValues.group || undefined,
            status: formValues.status ?? undefined,
          });
        },
      },
    },
  } as never,
});

function openCreate() {
  drawerData.value = {};
  formDrawerApi.setData(drawerData.value).open();
}

function openEdit(row: SysApi) {
  drawerData.value = { row };
  formDrawerApi.setData(drawerData.value).open();
}
</script>

<template>
  <Page>
    <Grid>
      <template #toolbar-tools>
        <Space :size="8" align="center">
          <Popconfirm
            title="确认同步"
            description="将从后端路由清单重新扫描并登记接口（命中则跳过）"
            @confirm="handleSync"
          >
            <Button :loading="syncLoading">同步接口</Button>
          </Popconfirm>
          <Button type="primary" @click="openCreate"> + 新增接口 </Button>
        </Space>
      </template>
      <template #method="{ row }">
        <Tag :color="METHOD_COLOR[row.method]">{{ row.method }}</Tag>
      </template>
      <template #group="{ row }">
        <Tag>{{ row.apiGroup }}</Tag>
      </template>
      <template #isEnabled="{ row }">
        <Tag :color="row.isEnabled === 1 ? 'success' : 'default'">
          {{ row.isEnabled === 1 ? '启用' : '禁用' }}
        </Tag>
      </template>
      <template #action="{ row }">
        <Space>
          <a @click="openEdit(row)">编辑</a>
          <Popconfirm title="确认删除" @confirm="deleteMut.mutate(row.id)">
            <a style="color: #ff4d4f">删除</a>
          </Popconfirm>
        </Space>
      </template>
    </Grid>
    <FormDrawer @success="gridApi.query()" />
  </Page>
</template>
