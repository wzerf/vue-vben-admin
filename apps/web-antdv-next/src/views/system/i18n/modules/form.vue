<script lang="ts" setup>
import type {
  CreateI18nLocaleRequest,
  I18nLocale,
  UpdateI18nLocaleRequest,
} from '#/api/system/i18n';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createI18nLocaleApi, updateI18nLocaleApi } from '#/api/system/i18n';
import { useLocaleFormSchema } from '#/views/system/i18n/data';

interface Props {
  /** 表单类型：locale = 语言（翻译抽屉走 translation-key-drawer.vue） */
  kind: 'locale';
}

const props = defineProps<Props>();

const emits = defineEmits<{
  (e: 'success'): void;
}>();

const formData = ref<I18nLocale | Record<string, unknown> | undefined>();
const id = ref<number>();
const isEdit = computed(() => !!formData.value?.id);

const [LocaleForm, localeFormApi] = useVbenForm({
  schema: useLocaleFormSchema() ?? [],
  showDefaultActions: false,
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
});

const [Drawer, drawerApi] = useVbenDrawer({
  onCancel() {
    drawerApi.close();
  },
  async onConfirm() {
    if (props.kind !== 'locale') return;
    const { valid } = await localeFormApi.validate();
    if (!valid) return;
    const values = await localeFormApi.getValues();
    const body = {
      code: values.code,
      name: values.name,
      sort: values.sort ?? 0,
      remark: values.remark ?? '',
      isDefault: values.isDefault ? 1 : 0,
      isEnabled: values.isEnabled ? 1 : 0,
    };
    const req = id.value
      ? updateI18nLocaleApi(id.value, body as Partial<UpdateI18nLocaleRequest>)
      : createI18nLocaleApi(body as CreateI18nLocaleRequest);

    drawerApi.lock();
    req
      .then(() => {
        emits('success');
        drawerApi.close();
      })
      .catch(() => {
        drawerApi.unlock();
      });
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = drawerApi.getData() as
      | (I18nLocale & { id?: number })
      | (Record<string, unknown> & { id?: number })
      | undefined;
    const editing = !!data?.id;

    localeFormApi.resetForm();

    if (editing) {
      formData.value = data;
      id.value = data?.id as number;
      const t = data as unknown as I18nLocale;
      await nextTick();
      localeFormApi.setValues({
        ...t,
        isDefault: t.isDefault === 1,
        isEnabled: t.isEnabled === 1,
      });
    } else {
      formData.value = undefined;
      id.value = undefined;
    }
  },
});

const drawerTitle = computed(() => (isEdit.value ? '编辑语言' : '新建语言'));
</script>

<template>
  <Drawer :title="drawerTitle">
    <LocaleForm v-if="props.kind === 'locale'" />
  </Drawer>
</template>
