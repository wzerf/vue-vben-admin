<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  message,
  Modal,
  Select,
  Space,
  theme,
  TypographyParagraph,
  Upload,
} from 'antdv-next';

import { fetchAllI18nLocalesApi, importI18nApi } from '#/api/system/i18n';

defineOptions({ name: 'I18nImportModal' });

const props = defineProps<{
  open: boolean;
}>();

const emits = defineEmits<{
  (e: 'update:open', v: boolean): void;
  (e: 'success'): void;
}>();

const { token } = theme.useToken();

const importType = ref<'raw' | 'simple'>('simple');
const targetLocaleCode = ref<string | undefined>(undefined);
const fileList = ref<any[]>([]);
const uploading = ref(false);

const localeOptions = ref<{ label: string; value: string }[]>([]);

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

const showTargetLocale = computed(() => importType.value === 'simple');

async function handleUpload(info: any) {
  fileList.value = [info.file];

  if (info.file.status !== 'uploading' && info.file.originFileObj) {
    uploading.value = true;
    try {
      const text = await info.file.originFileObj.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        message.error('文件内容不是合法的 JSON');
        return;
      }

      const body: any = { data };
      if (importType.value === 'simple' && targetLocaleCode.value) {
        body.targetLocaleCode = targetLocaleCode.value;
      }

      await importI18nApi(body);
      message.success('导入成功');
      emits('success');
      emits('update:open', false);
    } catch (error: any) {
      message.error(`导入失败：${error.message ?? '未知错误'}`);
    } finally {
      uploading.value = false;
    }
  }
}

function downloadTemplate() {
  const template: any =
    importType.value === 'raw'
      ? {
          '@type': 'raw',
          locales: [
            {
              code: 'zh-CN',
              name: '简体中文',
              isDefault: 1,
              sort: 0,
              isEnabled: 1,
            },
          ],
          translations: [
            {
              localeCode: 'zh-CN',
              translationKey: 'common.save',
              value: '保存',
              isEnabled: 1,
            },
          ],
        }
      : {
          '@type': 'simple',
          locales: {
            'zh-CN': { 'common.save': '保存', 'common.cancel': '取消' },
            'en-US': { 'common.save': 'Save', 'common.cancel': 'Cancel' },
          },
        };

  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `i18n-${importType.value}-template.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleClose() {
  emits('update:open', false);
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      fileList.value = [];
      importType.value = 'simple';
      targetLocaleCode.value = undefined;
      loadLocaleOptions();
    }
  },
);
</script>

<template>
  <Modal
    title="导入 JSON"
    :open="props.open"
    :width="560"
    :destroy-on-close="true"
    :footer="null"
    @cancel="handleClose"
  >
    <div class="flex flex-col gap-4">
      <!-- 导入类型 -->
      <div>
        <div class="mb-2 text-sm" :style="{ color: token.colorText }">
          导入格式
        </div>
        <Space :size="8">
          <Button
            size="small"
            :type="importType === 'simple' ? 'primary' : 'default'"
            @click="importType = 'simple'"
          >
            Simple
          </Button>
          <Button
            size="small"
            :type="importType === 'raw' ? 'primary' : 'default'"
            @click="importType = 'raw'"
          >
            Raw
          </Button>
        </Space>
        <TypographyParagraph type="secondary" class="mt-1 mb-0 text-xs">
          Simple 适合导入纯翻译文案；Raw 可同时导入语言定义和翻译数据
        </TypographyParagraph>
      </div>

      <!-- 目标语言 -->
      <div v-if="showTargetLocale">
        <div class="mb-2 text-sm" :style="{ color: token.colorText }">
          目标语言
        </div>
        <Select
          v-model:value="targetLocaleCode"
          :options="localeOptions"
          placeholder="选择要导入到的语言（若 JSON 已按语言分组则无需选择）"
          style="width: 100%"
          allow-clear
        />
        <TypographyParagraph type="secondary" class="mt-1 mb-0 text-xs">
          如果导入的 JSON 文件已经按语言分组（含 @type），则无需选择
        </TypographyParagraph>
      </div>

      <!-- 模板下载 -->
      <div>
        <Button @click="downloadTemplate">
          <Space :size="4" align="center">
            <IconifyIcon icon="ant-design:download-outlined" />
            <span>下载 {{ importType === 'simple' ? 'Simple' : 'Raw' }} 模板</span>
          </Space>
        </Button>
      </div>

      <!-- 上传 -->
      <div>
        <div class="mb-2 text-sm" :style="{ color: token.colorText }">
          选择文件
        </div>
        <Upload.Dragger
          :file-list="fileList"
          :before-upload="() => false"
          :show-upload-list="{ showRemoveIcon: false }"
          :max-count="1"
          accept=".json"
          @change="handleUpload"
        >
          <p class="text-2xl" style="margin-bottom: 8px">
            <IconifyIcon
              icon="ant-design:inbox-outlined"
              :style="{ color: token.colorPrimary }"
            />
          </p>
          <p :style="{ color: token.colorText }">
            点击或拖拽 JSON 文件到此区域上传
          </p>
          <p :style="{ color: token.colorTextSecondary, fontSize: '12px' }">
            仅支持 .json 格式文件
          </p>
        </Upload.Dragger>
      </div>

      <!-- 说明 -->
      <div
        class="flex items-start gap-1.5 rounded px-3 py-2.5 text-xs"
        :style="{
          color: token.colorTextSecondary,
          background: token.colorPrimaryBg,
          borderLeft: `3px solid ${token.colorPrimary}`,
        }"
      >
        <IconifyIcon
          icon="ant-design:info-circle-outlined"
          :style="{
            color: token.colorPrimary,
            fontSize: '14px',
            marginTop: '1px',
          }"
        />
        <span>导入时若键已存在，会将旧记录软删除后插入新记录。选择文件后自动上传。</span>
      </div>
    </div>
  </Modal>
</template>
