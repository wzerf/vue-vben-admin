import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { I18nLocale } from '#/api/system/i18n';

import { z } from '#/adapter/form';
import { fetchAllI18nLocalesApi } from '#/api/system/i18n';

/* ============================================================
 * 语言编码校验：BCP-47 风格（如 zh-CN / en-US / ja-JP）
 * ============================================================ */
export const I18N_LOCALE_CODE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/;

/* ============================================================
 * 语言 form schema（抽屉内表单）
 * ============================================================ */
export function useLocaleFormSchema(): VbenFormProps['schema'] {
  return [
    {
      component: 'Input',
      fieldName: 'code',
      label: '语言代码',
      rules: z
        .string()
        .min(1, '请输入语言代码')
        .regex(I18N_LOCALE_CODE_PATTERN, '形如 zh-CN / en-US / ja-JP'),
      componentProps: { placeholder: '例如 zh-CN' },
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '语言名称',
      rules: z.string().min(1, '请输入语言名称').max(64, '最长 64 字符'),
    },
    {
      component: 'InputNumber',
      fieldName: 'sort',
      label: '排序',
      defaultValue: 0,
      componentProps: { placeholder: '升序排序' },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      componentProps: { placeholder: '选填', rows: 3 },
    },
    {
      component: 'Switch',
      fieldName: 'isDefault',
      label: '设为默认语言',
      defaultValue: false,
    },
    {
      component: 'Switch',
      fieldName: 'isEnabled',
      label: '启用',
      defaultValue: true,
    },
  ];
}

/* ============================================================
 * 语言 列表检索 schema
 * ============================================================ */
export function useLocaleSearchSchema(): VbenFormProps['schema'] {
  return [
    { component: 'Input', fieldName: 'code', label: '语言代码' },
    { component: 'Input', fieldName: 'name', label: '语言名称' },
  ];
}

/* ============================================================
 * 翻译 列表检索 schema
 * ============================================================ */
export function useTranslationSearchSchema(): VbenFormProps['schema'] {
  return [{ component: 'Input', fieldName: 'value', label: '键或值' }];
}

/* ============================================================
 * 表格列定义
 * 第一列 type='checkbox' 用于多选；批量工具栏由父组件通过 gridEvents
 * （checkboxChange / checkboxAll）拿到勾选行后渲染。
 * ============================================================ */
export function useLocaleColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 44, fixed: 'left' },
    { field: 'id', title: 'ID', width: 80 },
    { field: 'code', title: '语言代码', width: 140, showOverflow: 'tooltip' },
    { field: 'name', title: '语言名称', width: 140, showOverflow: 'tooltip' },
    {
      field: 'isDefault',
      title: '默认',
      width: 80,
      slots: { default: 'locale_default' },
    },
    { field: 'sort', title: '排序', width: 80 },
    {
      slots: { default: 'locale_status' },
      field: 'isEnabled',
      title: '状态',
      width: 90,
    },
    { field: 'remark', title: '备注', minWidth: 160, showOverflow: 'tooltip' },
    {
      field: 'updatedAt',
      title: '更新时间',
      width: 170,
      formatter: 'formatDateTime',
    },
    {
      field: 'action',
      title: '操作',
      fixed: 'right',
      slots: { default: 'action' },
      width: 140,
    },
  ];
}

export function useTranslationColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 44, fixed: 'left' },
    { field: 'id', title: 'ID', width: 80 },
    {
      field: 'translationKey',
      title: '翻译键',
      width: 220,
      showOverflow: 'tooltip',
    },
    {
      field: 'value',
      title: '翻译值',
      width: 220,
      showOverflow: 'tooltip',
    },
    {
      slots: { default: 'translation_status' },
      field: 'isEnabled',
      title: '状态',
      width: 90,
    },
    { field: 'remark', title: '备注', minWidth: 160, showOverflow: 'tooltip' },
    {
      field: 'updatedAt',
      title: '更新时间',
      width: 170,
      formatter: 'formatDateTime',
    },
    {
      field: 'action',
      title: '操作',
      fixed: 'right',
      slots: { default: 'action' },
      width: 140,
    },
  ];
}

/**
 * 全部语言下拉（与字典类型下拉同构）：用于翻译新建/编辑时选择语言。
 * 不缓存：与父组件 typeOptions 同生命周期，避免 stale 数据。
 */
export async function fetchLocaleOptions(): Promise<
  Array<{ label: string; value: number }>
> {
  const list = await fetchAllI18nLocalesApi({ status: 1 });
  return list.map((l: I18nLocale) => ({
    label: `${l.name}（${l.code}）`,
    value: l.id,
  }));
}
