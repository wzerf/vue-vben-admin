<script lang="ts" setup>
import type { ImportFormat, PreviewRow, StagedFile } from './import-utils';

import { computed, h, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Steps,
  Tag,
  Tooltip,
  TypographyParagraph,
  Upload,
} from 'antdv-next';

import {
  fetchAllI18nLocalesApi,
  importI18nBatchApi,
  previewI18nImportApi,
} from '#/api/system/i18n';

import {
  buildPreviewRows,
  filterChangedOnly,
  mergeAllFiles,
  normalizePrefix,
  previewStats,
} from './import-utils';

defineOptions({ name: 'I18nImportModal' });

const props = defineProps<{
  open: boolean;
}>();

const emits = defineEmits<{
  (e: 'update:open', v: boolean): void;
  (e: 'success'): void;
}>();

const step = ref(0);
const format = ref<ImportFormat>('simple');
const staged = ref<StagedFile[]>([]);
const showChangedOnly = ref(true);
const submitting = ref(false);

const localeOptions = ref<Array<{ label: string; value: string }>>([]);

const previewState = ref<{
  currentRows: Array<{
    isEnabled: 0 | 1;
    localeCode: string;
    translationKey: string;
    value: string;
  }>;
  loading: boolean;
}>({ loading: false, currentRows: [] });

const mergedRows = computed(() => mergeAllFiles(staged.value));
const previewKeysByLocale = computed(() => {
  const m = new Map<string, string[]>();
  for (const r of mergedRows.value) {
    const arr = m.get(r.localeCode) ?? [];
    arr.push(r.key);
    m.set(r.localeCode, arr);
  }
  return [...m.entries()].map(([localeCode, keys]) => ({
    localeCode,
    keys: [...new Set(keys)],
  }));
});

const previewRows = computed(() =>
  buildPreviewRows(mergedRows.value, previewState.value.currentRows),
);
const stats = computed(() => previewStats(previewRows.value));
const visiblePreviewRows = computed(() =>
  showChangedOnly.value
    ? filterChangedOnly(previewRows.value)
    : previewRows.value,
);

const canGoStep2 = computed(
  () => staged.value.length > 0 && staged.value.some((s) => s.parseOk),
);
const canGoStep3 = computed(() =>
  staged.value
    .filter((s) => s.parseOk)
    .every((s) => s.localeCode && s.localeCode.length > 0),
);

async function loadLocaleOptions() {
  try {
    const locales = await fetchAllI18nLocalesApi({ status: 1 });
    localeOptions.value = locales.map((l) => ({
      label: `${l.name}（${l.code}）`,
      value: l.code,
    }));
  } catch {
    // 静默
  }
}

function reset() {
  step.value = 0;
  format.value = 'simple';
  staged.value = [];
  showChangedOnly.value = true;
  submitting.value = false;
  previewState.value = { loading: false, currentRows: [] };
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      reset();
      void loadLocaleOptions();
    }
  },
);

function onFormatChange(next: ImportFormat) {
  format.value = next;
  // 切换格式时清空，避免 mixed format
  staged.value = [];
}

function downloadTemplate() {
  const template: any =
    format.value === 'raw'
      ? {
          '@type': 'raw',
          locale: {
            code: 'zh-CN',
            name: '简体中文',
            isDefault: 1,
            sort: 0,
            isEnabled: 1,
          },
          translations: [
            {
              translationKey: 'page.title',
              value: '页面标题',
              isEnabled: 1,
            },
            {
              translationKey: 'page.desc',
              value: '页面描述',
              isEnabled: 1,
            },
          ],
        }
      : {
          '@type': 'simple',
          page: {
            title: '页面标题',
            desc: '页面描述',
          },
          common: {
            save: '保存',
            cancel: '取消',
          },
        };

  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `i18n-${format.value}-template.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// antd Upload 的 beforeUpload: () => false 阻止自动上传，自己处理 file
async function handleFile(file: File) {
  try {
    const text = await file.text();
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      staged.value.push({
        name: file.name,
        file,
        format: 'simple',
        payload: null,
        parseOk: false,
        errorMessage: 'JSON 解析失败',
        localeCode: '',
        prefix: '',
      });
      return false;
    }
    const detectedFormat =
      payload && typeof payload === 'object' && payload['@type'] === 'raw'
        ? 'raw'
        : 'simple';
    if (detectedFormat !== format.value) {
      message.warning(
        `文件 ${file.name} 检测为 ${detectedFormat} 格式，与当前选定的 ${format.value} 不一致`,
      );
    }
    const payloadLocale = detectedFormat === 'raw' ? payload.locale : undefined;
    const localeCode =
      detectedFormat === 'raw' && payloadLocale?.code ? payloadLocale.code : '';
    staged.value.push({
      name: file.name,
      file,
      format: detectedFormat,
      payload,
      parseOk: true,
      localeCode,
      prefix: '',
      payloadLocale,
    });
  } catch (error: any) {
    message.error(`读取文件失败：${error.message ?? '未知错误'}`);
  }
  return false;
}

function removeStaged(idx: number) {
  staged.value.splice(idx, 1);
}

function updateStaged(
  idx: number,
  patch: Partial<
    Pick<StagedFile, 'format' | 'localeCode' | 'payloadLocale' | 'prefix'>
  >,
) {
  const current = staged.value[idx];
  if (!current) return;
  const next = [...staged.value];
  next[idx] = { ...current, ...patch } as StagedFile;
  staged.value = next;
}

function detectFormat(s: StagedFile): ImportFormat {
  if (!s.parseOk) return 'simple';
  const obj = s.payload as null | Record<string, unknown>;
  return obj && obj['@type'] === 'raw' ? 'raw' : 'simple';
}

// antdv-next a-table 列定义（Step 2）
const fileConfigColumns = computed(() => [
  { title: '文件名', dataIndex: 'name', width: 200, ellipsis: true },
  {
    title: '格式',
    dataIndex: 'format',
    width: 80,
    customRender: ({ record }: { record: StagedFile }) =>
      h(Tag, { color: detectFormat(record) === 'raw' ? 'blue' : 'green' }, () =>
        detectFormat(record),
      ),
  },
  {
    title: '语言代码',
    dataIndex: 'localeCode',
    width: 240,
    customRender: ({
      record,
      index,
    }: {
      index: number;
      record: StagedFile;
    }) => {
      if (detectFormat(record) === 'raw' || !record.parseOk) {
        return h(Space, { size: 4 }, () => [
          h(
            Tag,
            { color: 'blue', style: 'margin:0' },
            () => record.payloadLocale?.code || record.localeCode || '—',
          ),
          h(
            'span',
            {
              class: 'text-xs',
              style: 'color:var(--ant-color-text-secondary)',
            },
            '来自文件',
          ),
        ]);
      }
      return h(Select, {
        value: record.localeCode,
        options: localeOptions.value,
        placeholder: '选择语言',
        showSearch: true,
        style: 'width:220px',
        'onUpdate:value': (v: unknown) =>
          updateStaged(index, { localeCode: String(v ?? '') }),
      });
    },
  },
  {
    title: '前缀',
    dataIndex: 'prefix',
    width: 180,
    customRender: ({
      record,
      index,
    }: {
      index: number;
      record: StagedFile;
    }) => {
      if (detectFormat(record) === 'raw' || !record.parseOk) {
        return h(
          'span',
          { class: 'text-xs', style: 'color:var(--ant-color-text-secondary)' },
          '—',
        );
      }
      return h('input', {
        type: 'text',
        value: record.prefix,
        placeholder: '可选，如 app.',
        onInput: (e: Event) =>
          updateStaged(index, {
            prefix: normalizePrefix((e.target as HTMLInputElement).value),
          }),
        style:
          'width:100%;padding:4px 8px;border:1px solid #d9d9d9;border-radius:4px',
      });
    },
  },
  {
    title: '状态',
    dataIndex: 'parseOk',
    width: 90,
    customRender: ({ record }: { record: StagedFile }) =>
      record.parseOk
        ? h(Tag, { color: 'success' }, () => '解析成功')
        : h(Tag, { color: 'error' }, () => record.errorMessage ?? '失败'),
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 80,
    customRender: ({ index }: { index: number }) =>
      h(
        Button,
        { type: 'text', danger: true, onClick: () => removeStaged(index) },
        () => '移除',
      ),
  },
]);

// Step 3 预览列
const previewColumns = computed(() => [
  {
    title: '变更类型',
    dataIndex: 'op',
    width: 110,
    customRender: ({ record }: { record: PreviewRow }) => {
      const sameValue = record.oldValue === record.newValue;
      const unchanged =
        record.duplicate && sameValue && record.oldValue !== undefined;
      if (unchanged) return h(Tag, {}, () => '未变更');
      if (record.op === 'create')
        return h(Tag, { color: 'green' }, () => '新增');
      if (record.op === 'update')
        return h(Tag, { color: 'blue' }, () => '修改');
      return h(Tag, { color: 'red' }, () => '重复');
    },
  },
  { title: '语言代码', dataIndex: 'localeCode', width: 100 },
  {
    title: '翻译键',
    dataIndex: 'key',
    width: 220,
    customRender: ({ record }: { record: PreviewRow }) =>
      h(Space, { size: 4 }, () => [
        h('span', { style: 'font-family:monospace' }, record.key),
        record.oldIsEnabled === undefined
          ? null
          : h(
              Tooltip,
              {
                title: record.oldIsEnabled === 0 ? '现状禁用' : '现状启用',
              },
              () =>
                h(IconifyIcon, {
                  icon:
                    record.oldIsEnabled === 0
                      ? 'ant-design:minus-circle-outlined'
                      : 'ant-design:check-circle-outlined',
                  style: `color:${record.oldIsEnabled === 0 ? '#bfbfbf' : '#52c41a'}`,
                }),
            ),
      ]),
  },
  {
    title: '旧值 / 新值',
    width: 360,
    customRender: ({ record }: { record: PreviewRow }) =>
      h('div', { style: 'line-height:1.5' }, [
        h('div', { style: 'color:#ff4d4f' }, record.oldValue ?? '—'),
        h('div', { style: 'color:#52c41a' }, record.newValue),
      ]),
  },
  {
    title: '备注',
    dataIndex: 'remark',
    width: 140,
    customRender: ({ record }: { record: PreviewRow }) =>
      record.remark
        ? h('span', {}, record.remark)
        : h('span', { style: 'color:#999' }, '-'),
  },
  {
    title: '来源文件',
    dataIndex: 'sourceFile',
    width: 160,
    ellipsis: true,
  },
]);

async function goToStep3() {
  step.value = 2;
  previewState.value = { loading: true, currentRows: [] };
  try {
    const res = await previewI18nImportApi({
      items: previewKeysByLocale.value,
    });
    previewState.value = {
      loading: false,
      currentRows: (res.currentRows ?? []).map((r) => ({
        localeCode: r.localeCode ?? '',
        translationKey: r.translationKey,
        value: r.value,
        isEnabled: r.isEnabled,
      })),
    };
  } catch (error: any) {
    previewState.value = { loading: false, currentRows: [] };
    message.error(`预览失败：${error.message ?? '未知错误'}`);
  }
}

async function submitImport() {
  submitting.value = true;
  try {
    const items = staged.value
      .filter((s) => s.parseOk)
      .map((s) => ({
        name: s.name,
        prefix: s.prefix || undefined,
        localeCode: s.localeCode,
        format: detectFormat(s),
        payload: s.payload,
      }));
    const res = await importI18nBatchApi({ items });
    const perFile = res.affected.perFile ?? [];
    const failed = perFile.filter((p) => !p.ok);
    if (failed.length > 0) {
      Modal.warning({
        title: '导入完成（部分失败）',
        content: `成功 ${perFile.length - failed.length} 个文件，失败 ${failed.length} 个文件`,
      });
    } else {
      message.success(
        `导入成功：新增 ${res.affected.createdTranslations} 条翻译`,
      );
    }
    emits('success');
    emits('update:open', false);
  } catch (error: any) {
    message.error(`导入失败：${error.message ?? '未知错误'}`);
  } finally {
    submitting.value = false;
  }
}

function goConfirm() {
  Modal.confirm({
    title: '确认导入',
    content: `即将导入 ${stats.value.total} 条翻译：新增 ${stats.value.create} 条 / 修改 ${stats.value.update} 条 / 重复 ${stats.value.duplicate} 条（后者覆盖）${
      stats.value.unchanged > 0
        ? ` / 与现状一致 ${stats.value.unchanged} 条`
        : ''
    }${
      stats.value.oldDisabled > 0
        ? ` / 现状禁用 ${stats.value.oldDisabled} 条`
        : ''
    }`,
    okText: '确认导入',
    cancelText: '取消',
    onOk: submitImport,
  });
}

function handleClose() {
  emits('update:open', false);
}
</script>

<template>
  <Modal
    title="导入 JSON"
    :open="props.open"
    :width="920"
    :destroy-on-close="true"
    :footer="null"
    :mask-closable="false"
    @cancel="handleClose"
  >
    <Steps
      :current="step"
      :items="[
        { title: '选择格式与文件' },
        { title: '配置选项' },
        { title: '预览与导入' },
      ]"
      style="margin-bottom: 24px"
    />

    <!-- Step 1 -->
    <div v-if="step === 0">
      <Space direction="vertical" :size="16" style="width: 100%">
        <div>
          <div class="mb-2 text-sm font-medium">导入格式</div>
          <Space :size="8">
            <Button
              :type="format === 'simple' ? 'primary' : 'default'"
              @click="onFormatChange('simple')"
            >
              Simple（嵌套字典）
            </Button>
            <Button
              :type="format === 'raw' ? 'primary' : 'default'"
              @click="onFormatChange('raw')"
            >
              Raw（含语言元数据）
            </Button>
          </Space>
          <TypographyParagraph type="secondary" class="mt-1 mb-0 text-xs">
            {{
              format === 'simple'
                ? 'Simple 适合批量导入纯翻译文案；嵌套字典会自动展开为扁平键。'
                : 'Raw 包含语言元数据（isDefault、name 等），可同时新增/更新语言。'
            }}
          </TypographyParagraph>
        </div>

        <Button @click="downloadTemplate">
          <Space :size="4" align="center">
            <IconifyIcon icon="ant-design:download-outlined" />
            <span>下载 {{ format === 'simple' ? 'Simple' : 'Raw' }} 模板</span>
          </Space>
        </Button>

        <div>
          <div class="mb-2 text-sm font-medium">选择文件（可多选）</div>
          <Upload.Dragger
            :file-list="[]"
            :before-upload="handleFile"
            :show-upload-list="false"
            multiple
            accept=".json"
          >
            <p class="text-2xl" style="margin-bottom: 8px">
              <IconifyIcon icon="ant-design:inbox-outlined" />
            </p>
            <p>
              点击或拖拽 {{ format === 'simple' ? 'Simple' : 'Raw' }} JSON
              文件到此区域
            </p>
            <p class="text-xs" style="color: var(--ant-color-text-secondary)">
              仅支持 .json 格式
            </p>
          </Upload.Dragger>
        </div>

        <div
          v-if="staged.length > 0"
          class="text-xs"
          style="color: var(--ant-color-text-secondary)"
        >
          已选 {{ staged.length }} 个文件，其中
          {{ staged.filter((s) => s.parseOk).length }} 个解析成功
        </div>

        <div style="text-align: right">
          <Space>
            <Button @click="handleClose">取消</Button>
            <Button type="primary" :disabled="!canGoStep2" @click="step = 1">
              下一步
            </Button>
          </Space>
        </div>
      </Space>
    </div>

    <!-- Step 2 -->
    <div v-else-if="step === 1">
      <Space direction="vertical" :size="16" style="width: 100%">
        <Alert
          type="info"
          show-icon
          message="为 simple 文件配置语言代码与前缀；raw 文件自动从文件内读取，不可修改。"
        />
        <a-table
          :data-source="staged"
          :columns="fileConfigColumns"
          :pagination="false"
          :row-key="(r: StagedFile) => `${staged.indexOf(r)}-${r.name}`"
          size="small"
        />

        <div style="text-align: right">
          <Space>
            <Button @click="step = 0">上一步</Button>
            <Button type="primary" :disabled="!canGoStep3" @click="goToStep3">
              下一步
            </Button>
          </Space>
        </div>
      </Space>
    </div>

    <!-- Step 3 -->
    <div v-else-if="step === 2">
      <Space direction="vertical" :size="16" style="width: 100%">
        <div
          v-if="previewState.loading"
          style="padding: 24px 0; text-align: center"
        >
          <Progress :percent="50" status="active" :show-info="false" />
          <TypographyParagraph type="secondary">
            正在加载现状快照…
          </TypographyParagraph>
        </div>
        <template v-else>
          <Space :size="8" wrap>
            <Tag color="green">新增 {{ stats.create }}</Tag>
            <Tag color="blue">修改 {{ stats.update }}</Tag>
            <Tag color="red">重复 {{ stats.duplicate }}</Tag>
            <Tag>未变更 {{ stats.unchanged }}</Tag>
            <Tag v-if="stats.oldDisabled > 0" color="warning">
              现状禁用 {{ stats.oldDisabled }}
            </Tag>
            <Popconfirm
              :title="showChangedOnly ? '显示全部行？' : '仅显示有变更的行？'"
              ok-text="切换"
              cancel-text="取消"
              @confirm="showChangedOnly = !showChangedOnly"
            >
              <Button size="small">
                {{ showChangedOnly ? '显示全部行' : '仅显示变更行' }}
              </Button>
            </Popconfirm>
          </Space>

          <a-table
            :data-source="visiblePreviewRows"
            :columns="previewColumns"
            :pagination="{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (t: number) => `共 ${t} 条`,
            }"
            :row-key="
              (r: PreviewRow, i?: number) =>
                `${r.localeCode}-${r.key}-${r.sourceFile}-${i ?? 0}`
            "
            size="small"
            :scroll="{ y: 400 }"
          />
        </template>

        <div style="text-align: right">
          <Space>
            <Button @click="step = 1">上一步</Button>
            <Button
              type="primary"
              :loading="submitting"
              :disabled="
                previewState.loading || previewRows.length === 0 || !canGoStep3
              "
              @click="goConfirm"
            >
              下一步
            </Button>
          </Space>
        </div>
      </Space>
    </div>
  </Modal>
</template>
