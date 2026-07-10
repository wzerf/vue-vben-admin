<script lang="ts" setup>
import type {
  CreateMenuRequest,
  MenuBindApiItem,
  SysMenu,
} from '#/api/system/menu';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Checkbox,
  Collapse,
  CollapsePanel,
  Input,
  message,
  TabPane,
  Tabs,
  Tag,
} from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { fetchAllApisApi } from '#/api/system/api';
import {
  createMenuApi,
  fetchAllMenusApi,
  fetchMenuApisApi,
  setMenuApisApi,
  updateMenuApi,
} from '#/api/system/menu';
import {
  buildParentOptions,
  useMenuFormSchema,
} from '#/views/system/menu/data';

const emits = defineEmits<{
  (e: 'success'): void;
}>();

const id = ref<number | undefined>();
const isEdit = computed(() => !!id.value);
const activeTab = ref<'basic' | 'bind'>('basic');

// 父菜单选项 + 接口数据
const parentOptions = ref<Array<{ label: string; value: number }>>([]);
const allApis = ref<MenuBindApiItem[]>([]);
const apiSearch = ref('');
const boundIds = ref<Set<number>>(new Set());
const saving = ref(false);

const [Form, formApi] = useVbenForm({
  schema: useMenuFormSchema() ?? [],
  showDefaultActions: false,
});

const [Drawer, drawerApi] = useVbenDrawer({
  onConfirm: async () => {
    await (activeTab.value === 'basic' ? saveBasic() : saveBind());
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    activeTab.value = 'basic';
    apiSearch.value = '';
    boundIds.value = new Set();

    const data = drawerApi.getData<{
      mode: 'create' | 'edit';
      presetParentId?: null | number;
      row?: SysMenu;
    }>();
    const row = data?.mode === 'edit' ? data.row : undefined;
    const editing = !!row;

    // 拉父菜单与接口清单
    const [menus, apis] = await Promise.all([
      fetchAllMenusApi(),
      fetchAllApisApi(),
    ]);
    parentOptions.value = buildParentOptions(
      menus,
      editing ? row?.id : undefined,
    );

    // 注入父菜单下拉 options 到 schema
    formApi.updateSchema([
      {
        fieldName: 'parentId',
        componentProps: {
          options: parentOptions.value,
          clearable: true,
          filterable: true,
        },
      },
    ]);

    formApi.resetForm();

    if (editing && row) {
      id.value = row.id;
      await formApi.setValues({
        parentId: row.parentId,
        name: row.name,
        type: row.type,
        path: row.path ?? '',
        component: row.component ?? '',
        redirect: row.redirect,
        icon: row.icon,
        permissionCode: row.permissionCode ?? '',
        sort: row.sort,
        isHidden: row.isHidden === 1 ? 1 : 0,
        isEnabled: row.isEnabled === 1 ? 1 : 0,
        remark: row.remark,
      });
      // 拉已绑定接口
      const bound = await fetchMenuApisApi(row.id);
      allApis.value = bound;
      const init = new Set<number>();
      bound.forEach((a) => {
        if (a.bound) init.add(a.id);
      });
      boundIds.value = init;
    } else {
      id.value = undefined;
      const preset = data?.presetParentId ?? null;
      allApis.value = apis.map((a) => ({ ...a, bound: false }));
      await formApi.setValues({
        parentId: preset,
        name: '',
        type: 'MENU',
        path: '',
        component: '',
        redirect: '',
        icon: '',
        permissionCode: '',
        sort: 0,
        isHidden: 0,
        isEnabled: 1,
        remark: '',
      });
    }
  },
});

async function saveBasic() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const values = await formApi.getValues();
  const body: CreateMenuRequest = {
    parentId: (values.parentId as number) ?? null,
    name: values.name as string,
    type: values.type as SysMenu['type'],
    path: values.type === 'MENU' ? (values.path as string) || null : null,
    component:
      values.type === 'MENU' ? (values.component as string) || null : null,
    icon: (values.icon as string) ?? '',
    redirect: (values.redirect as string) ?? '',
    permissionCode: (values.permissionCode as string) || null,
    sort: (values.sort as number) ?? 0,
    isHidden: values.isHidden ? 1 : 0,
    isEnabled: values.isEnabled ? 1 : 0,
    remark: (values.remark as string) ?? '',
  };
  saving.value = true;
  try {
    if (isEdit.value && id.value) {
      await updateMenuApi({ id: id.value, data: body });
      message.success('保存成功');
    } else {
      await createMenuApi(body);
      message.success('创建成功');
    }
    emits('success');
    drawerApi.close();
  } catch (error) {
    message.error((error as Error).message ?? '保存失败');
  } finally {
    saving.value = false;
  }
}

async function saveBind() {
  if (!isEdit.value || !id.value) {
    message.warning('请先保存菜单基础信息');
    return;
  }
  saving.value = true;
  try {
    await setMenuApisApi(id.value, [...boundIds.value]);
    message.success('接口绑定已保存');
  } catch (error) {
    message.error((error as Error).message ?? '保存绑定失败');
  } finally {
    saving.value = false;
  }
}

const groupedApis = computed(() => {
  const groups = new Map<string, MenuBindApiItem[]>();
  const kw = apiSearch.value.trim().toLowerCase();
  allApis.value.forEach((a) => {
    if (kw) {
      const hit =
        a.name.toLowerCase().includes(kw) ||
        a.path.toLowerCase().includes(kw) ||
        a.permissionCode.toLowerCase().includes(kw);
      if (!hit) return;
    }
    const arr = groups.get(a.apiGroup) ?? [];
    arr.push(a);
    groups.set(a.apiGroup, arr);
  });
  return [...groups.entries()].toSorted((a, b) => a[0].localeCompare(b[0]));
});

const METHOD_COLOR: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple',
  OPTIONS: 'default',
  HEAD: 'default',
};

function toggleApi(id: number, checked: boolean) {
  const next = new Set(boundIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  boundIds.value = next;
}
</script>

<template>
  <Drawer :title="isEdit ? '编辑菜单' : '新增菜单'" :confirm-loading="saving">
    <Tabs v-model:active-key="activeTab">
      <TabPane key="basic" tab="基础信息" />
      <TabPane
        key="bind"
        :tab="`绑定接口（${boundIds.size}）`"
        :disabled="!isEdit"
      />
    </Tabs>

    <Form v-show="activeTab === 'basic'" />

    <div v-show="activeTab === 'bind'">
      <Input
        v-model:value="apiSearch"
        placeholder="按路径或名称搜索接口..."
        allow-clear
        style="margin-bottom: 12px"
      />
      <div style="margin-bottom: 8px; color: #666">
        已选 <strong>{{ boundIds.size }}</strong> 个接口 ·
        修改后点击「确定」写入
        <Tag>sys_menu_api</Tag>
      </div>
      <Collapse :default-active-key="groupedApis.map((g) => g[0])">
        <CollapsePanel
          v-for="[group, apis] in groupedApis"
          :key="group"
          :header="`${group} · ${apis.length} 个`"
        >
          <div style="display: flex; flex-direction: column; gap: 6px">
            <Checkbox
              v-for="a in apis"
              :key="a.id"
              :checked="boundIds.has(a.id)"
              @change="(e: any) => toggleApi(a.id, e.target.checked)"
            >
              <span style="font-family: monospace; font-size: 12px">
                <Tag :color="METHOD_COLOR[a.method]" style="margin-right: 6px">
                  {{ a.method }}
                </Tag>
                {{ a.path }}
              </span>
              <span style="margin-left: 8px; font-size: 12px; color: #999">
                {{ a.name }}
              </span>
            </Checkbox>
          </div>
        </CollapsePanel>
      </Collapse>
    </div>
  </Drawer>
</template>
