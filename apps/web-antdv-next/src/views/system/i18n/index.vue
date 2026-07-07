<script lang="ts" setup>
import type { VxeGridListeners } from '#/adapter/vxe-table';
import type { I18nLocale, I18nTranslation } from '#/api/system/i18n';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  message,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tag,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useDictLookups } from '#/api/system/dict/hooks';
import {
  batchI18nLocaleApi,
  batchI18nTranslationApi,
  deleteI18nTranslationApi,
  exportI18nApi,
  fetchAllI18nLocalesApi,
  fetchI18nLocaleListApi,
  fetchI18nTranslationListApi,
} from '#/api/system/i18n';
import {
  useLocaleColumns,
  useLocaleSearchSchema,
  useTranslationColumns,
  useTranslationSearchSchema,
} from '#/views/system/i18n/data';
import Form from '#/views/system/i18n/modules/form.vue';
import ImportModal from '#/views/system/i18n/modules/import-modal.vue';
import TranslationKeyDrawer from '#/views/system/i18n/modules/translation-key-drawer.vue';

defineOptions({ name: 'SystemI18n' });

type BulkAction = 'delete' | 'disable' | 'enable';

const BULK_SUCCESS_TEXT: Record<BulkAction, string> = {
  delete: '批量删除成功',
  disable: '批量禁用成功',
  enable: '批量启用成功',
};

const selectedLocaleId = ref<null | number>(null);
const selectedLocale = ref<I18nLocale | null>(null);

const entryLocaleCode = ref<string | undefined>(undefined);

const localeSelectedIds = ref<Set<number>>(new Set());
const translationSelectedIds = ref<Set<number>>(new Set());
const bulkLoading = ref({ locale: false, translation: false });

const exportType = ref<'raw' | 'simple'>('simple');
const importModalOpen = ref(false);
const exportModalOpen = ref(false);

const [LocaleFormDrawer, localeFormDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

// 翻译多语抽屉：TranslationKeyDrawer 自己持有 useVbenDrawer + props 直传,
// 父组件通过 v-model:open + :source-row 直传参数 (不走 connectedComponent
// 的 setData 通道, 避免响应式同步问题)。

const editingTranslation = ref<I18nTranslation | null>(null);
const translationDrawerOpen = ref(false);

// 字典驱动：locale_default / translation_status 走 useDictLookups，
// 颜色与文本由 sys_default_status / sys_switch_status 字典供给。
const dictLookups = useDictLookups();

const localeColumns: ReturnType<typeof useLocaleColumns> = useLocaleColumns();

const localeGridEvents: VxeGridListeners<I18nLocale> = {
  currentRowChange: ({ row }) => {
    if (!row) return;
    entryLocaleCode.value = row.code;
    selectedLocaleId.value = row.id;
    selectedLocale.value = row;
    translationGridApi.reload();
  },
  checkboxChange: ({ row, checked }) => {
    if (!row) return;
    const next = new Set(localeSelectedIds.value);
    if (checked) next.add(row.id);
    else next.delete(row.id);
    localeSelectedIds.value = next;
  },
  checkboxAll: ({ checked }) => {
    const records = (localeGridApi.grid?.getCheckboxRecords?.() ??
      []) as I18nLocale[];
    localeSelectedIds.value = checked
      ? new Set(records.map((r) => r.id))
      : new Set();
  },
};

const [LocaleGrid, localeGridApi] = useVbenVxeGrid<I18nLocale>({
  formOptions: {
    collapsed: false,
    schema: useLocaleSearchSchema(),
    showCollapseButton: false,
  },
  gridEvents: localeGridEvents,
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: localeColumns,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown>,
        ) => {
          return await fetchI18nLocaleListApi({
            page: page.currentPage,
            pageSize: page.pageSize,
            code: (formValues.code as string) || undefined,
            name: (formValues.name as string) || undefined,
          });
        },
      },
    },
    rowConfig: { isCurrent: true },
    size: 'small',
    stripe: true,
    toolbarConfig: {
      custom: true,
      refresh: true,
      zoom: true,
    },
  } as never,
});

const translationColumns: ReturnType<typeof useTranslationColumns> =
  useTranslationColumns();

const translationGridEvents: VxeGridListeners<I18nTranslation> = {
  checkboxChange: ({ row, checked }) => {
    if (!row) return;
    const next = new Set(translationSelectedIds.value);
    if (checked) next.add(row.id);
    else next.delete(row.id);
    translationSelectedIds.value = next;
  },
  checkboxAll: ({ checked }) => {
    const records = (translationGridApi.grid?.getCheckboxRecords?.() ??
      []) as I18nTranslation[];
    translationSelectedIds.value = checked
      ? new Set(records.map((r) => r.id))
      : new Set();
  },
};

const [TranslationGrid, translationGridApi] = useVbenVxeGrid<I18nTranslation>({
  formOptions: {
    collapsed: false,
    schema: useTranslationSearchSchema(),
    showCollapseButton: false,
  },
  gridEvents: translationGridEvents,
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: translationColumns,
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown>,
        ) => {
          return await fetchI18nTranslationListApi({
            page: page.currentPage,
            pageSize: page.pageSize,
            localeCode: entryLocaleCode.value,
            value: (formValues.value as string) || undefined,
          });
        },
      },
    },
    size: 'small',
    stripe: true,
    toolbarConfig: {
      custom: true,
      refresh: true,
      zoom: true,
    },
  } as never,
});

function openLocaleCreate() {
  localeFormDrawerApi.setData({}).open();
}

function openTranslationCreate() {
  editingTranslation.value = null;
  translationDrawerOpen.value = true;
}

function openTranslationEdit(row: I18nTranslation) {
  editingTranslation.value = row;
  translationDrawerOpen.value = true;
}

function clearTranslationSelection() {
  entryLocaleCode.value = undefined;
  selectedLocaleId.value = null;
  selectedLocale.value = null;
  translationGridApi.reload();
}

function onLocaleSaved() {
  localeGridApi.reload();
  if (selectedLocaleId.value === null) {
    clearTranslationSelection();
  } else {
    translationGridApi.reload();
  }
}

async function bulkLocaleAction(action: BulkAction) {
  const ids = [...localeSelectedIds.value];
  if (ids.length === 0) {
    message.warning('请先勾选要操作的语言');
    return;
  }
  bulkLoading.value.locale = true;
  try {
    await batchI18nLocaleApi({ action, ids });
    message.success(BULK_SUCCESS_TEXT[action]);
    localeSelectedIds.value = new Set();
    localeGridApi.grid?.clearCheckboxRow?.();
    localeGridApi.reload();
    if (action === 'delete' && selectedLocaleId.value !== null) {
      clearTranslationSelection();
    }
  } catch (error) {
    message.error(`批量操作失败：${(error as Error).message ?? '未知错误'}`);
  } finally {
    bulkLoading.value.locale = false;
  }
}

async function bulkTranslationAction(action: BulkAction) {
  const ids = [...translationSelectedIds.value];
  if (ids.length === 0) {
    message.warning('请先勾选要操作的翻译');
    return;
  }
  bulkLoading.value.translation = true;
  try {
    await batchI18nTranslationApi({ action, ids });
    message.success(BULK_SUCCESS_TEXT[action]);
    translationSelectedIds.value = new Set();
    translationGridApi.grid?.clearCheckboxRow?.();
    translationGridApi.reload();
  } catch (error) {
    message.error(`批量操作失败：${(error as Error).message ?? '未知错误'}`);
  } finally {
    bulkLoading.value.translation = false;
  }
}

function openImportModal() {
  importModalOpen.value = true;
}

function openExportModal() {
  if (localeSelectedIds.value.size === 0) {
    message.warning('请先勾选要导出的语言');
    return;
  }
  exportModalOpen.value = true;
}

async function confirmExport() {
  const ids = [...localeSelectedIds.value];
  try {
    const data = await exportI18nApi({ ids, type: exportType.value });
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `i18n-export-${exportType.value}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
    exportModalOpen.value = false;
  } catch (error: any) {
    message.error(`导出失败：${error.message ?? '未知错误'}`);
  }
}

function onImportSuccess() {
  localeGridApi.reload();
  translationGridApi.reload();
}

onMounted(async () => {
  // 预热默认语言的全量翻译 key, 让新建翻译时去重校验有数据可用
  try {
    await fetchAllI18nLocalesApi({ status: 1 });
  } catch {
    // 静默失败：drawer 打开时再尝试
  }
});
</script>

<template>
  <Page auto-content-height>
    <Row :gutter="16">
      <Col :span="24" :md="12">
        <Card>
          <LocaleGrid table-title="语言">
            <template #toolbar-tools>
              <Space :size="8" align="center">
                <span
                  v-if="localeSelectedIds.size > 0"
                  class="text-xs"
                  style="color: var(--ant-color-text-secondary)"
                >
                  已选
                  <strong style="color: var(--ant-color-text)">{{
                    localeSelectedIds.size
                  }}</strong>
                  条
                </span>
                <Button
                  v-if="localeSelectedIds.size > 0"
                  size="small"
                  :loading="bulkLoading.locale"
                  @click="bulkLocaleAction('enable')"
                >
                  批量启用
                </Button>
                <Button
                  v-if="localeSelectedIds.size > 0"
                  size="small"
                  :loading="bulkLoading.locale"
                  @click="bulkLocaleAction('disable')"
                >
                  批量禁用
                </Button>
                <Popconfirm
                  v-if="localeSelectedIds.size > 0"
                  title="确定要删除选中的语言？"
                  :description="`若仍有翻译将无法删除；默认语言禁止删除。当前共 ${localeSelectedIds.size} 项。`"
                  @confirm="bulkLocaleAction('delete')"
                >
                  <Button
                    size="small"
                    danger
                    ghost
                    :loading="bulkLoading.locale"
                  >
                    批量删除
                  </Button>
                </Popconfirm>
                <!-- 导入 / 导出 -->
                <Button
                  v-if="localeSelectedIds.size === 0"
                  size="small"
                  @click="openImportModal"
                >
                  导入
                </Button>
                <Button
                  size="small"
                  :disabled="localeSelectedIds.size === 0"
                  @click="openExportModal"
                >
                  导出
                </Button>
                <Button
                  v-if="localeSelectedIds.size === 0"
                  type="primary"
                  @click="openLocaleCreate"
                >
                  新建语言
                </Button>
              </Space>
            </template>
            <template #action="{ row }">
              <Space>
                <Button
                  type="link"
                  size="small"
                  @click="localeFormDrawerApi.setData(row).open()"
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确定要删除该语言？"
                  description="若仍有翻译将无法删除；默认语言禁止删除。"
                >
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            </template>

            <template #locale_default="{ row }">
              <Tag
                :color="
                  dictLookups.lookupDefaultTagType(row.isDefault as 0 | 1) ??
                  'default'
                "
                size="small"
              >
                {{ dictLookups.lookupDefaultLabel(row.isDefault as 0 | 1) }}
              </Tag>
            </template>
            <template #locale_status="{ row }">
              <Tag
                :color="row.isEnabled === 1 ? 'success' : 'default'"
                size="small"
              >
                {{ row.isEnabled === 1 ? '启用' : '禁用' }}
              </Tag>
            </template>
          </LocaleGrid>
        </Card>
      </Col>

      <Col :span="24" :md="12">
        <Card>
          <TranslationGrid>
            <template #table-title>
              <Space align="center" :size="8">
                <span style="font-size: 16px">翻译</span>
                <Tag
                  v-if="selectedLocale"
                  color="blue"
                  closable
                  style="font-size: 14px"
                  @close="clearTranslationSelection"
                >
                  {{ selectedLocale.name }}（{{ selectedLocale.code }}）
                </Tag>
              </Space>
            </template>
            <template #translation_status="{ row }">
              <Tag
                :color="
                  dictLookups.lookupSwitchTagType(row.isEnabled as 0 | 1) ??
                  'default'
                "
                size="small"
              >
                {{ dictLookups.lookupSwitchLabel(row.isEnabled as 0 | 1) }}
              </Tag>
            </template>
            <template #toolbar-tools>
              <Space :size="8" align="center">
                <span
                  v-if="translationSelectedIds.size > 0"
                  class="text-xs"
                  style="color: var(--ant-color-text-secondary)"
                >
                  已选
                  <strong style="color: var(--ant-color-text)">{{
                    translationSelectedIds.size
                  }}</strong>
                  条
                </span>
                <Button
                  v-if="translationSelectedIds.size > 0"
                  size="small"
                  :loading="bulkLoading.translation"
                  @click="bulkTranslationAction('enable')"
                >
                  批量启用
                </Button>
                <Button
                  v-if="translationSelectedIds.size > 0"
                  size="small"
                  :loading="bulkLoading.translation"
                  @click="bulkTranslationAction('disable')"
                >
                  批量禁用
                </Button>
                <Popconfirm
                  v-if="translationSelectedIds.size > 0"
                  title="确定要删除选中的翻译？"
                  @confirm="bulkTranslationAction('delete')"
                >
                  <Button
                    size="small"
                    danger
                    ghost
                    :loading="bulkLoading.translation"
                  >
                    批量删除
                  </Button>
                </Popconfirm>
                <Button
                  v-if="translationSelectedIds.size === 0"
                  type="primary"
                  @click="openTranslationCreate"
                >
                  新建翻译
                </Button>
              </Space>
            </template>
            <template #action="{ row }">
              <Space>
                <Button
                  type="link"
                  size="small"
                  @click="openTranslationEdit(row)"
                >
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  @click="
                    deleteI18nTranslationApi(row.id)
                      .then(() => translationGridApi.reload())
                      .then(() => message.success('删除成功'))
                      .catch((err: Error) =>
                        message.error(`删除失败：${err.message}`),
                      )
                  "
                >
                  删除
                </Button>
              </Space>
            </template>
          </TranslationGrid>
        </Card>
      </Col>
    </Row>

    <LocaleFormDrawer kind="locale" @success="onLocaleSaved" />
    <ImportModal v-model:open="importModalOpen" @success="onImportSuccess" />
    <Modal
      v-model:open="exportModalOpen"
      title="导出 JSON"
      :width="400"
      :destroy-on-close="true"
      ok-text="导出"
      cancel-text="取消"
      @ok="confirmExport"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm" style="color: var(--ant-color-text-secondary)">导出格式</span>
        <Button
          size="small"
          :type="exportType === 'simple' ? 'primary' : 'default'"
          @click="exportType = 'simple'"
        >
          Simple
        </Button>
        <Button
          size="small"
          :type="exportType === 'raw' ? 'primary' : 'default'"
          @click="exportType = 'raw'"
        >
          Raw
        </Button>
      </div>
    </Modal>
    <TranslationKeyDrawer
      v-model:open="translationDrawerOpen"
      :source-row="editingTranslation"
      :default-locale-code="entryLocaleCode ?? 'zh-CN'"
      initial-key=""
      @success="translationGridApi.reload()"
    />
  </Page>
</template>
