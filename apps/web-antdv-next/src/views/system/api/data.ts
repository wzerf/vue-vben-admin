import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';

/* ============================================================
 * HTTP 方法 / 状态 常量
 * ============================================================ */
export const HTTP_METHOD_OPTIONS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
  'HEAD',
].map((m) => ({ label: m, value: m }));

export const METHOD_COLOR: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple',
  OPTIONS: 'default',
  HEAD: 'default',
};

export const API_STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

/* ============================================================
 * 接口列表列定义（vxe-grid 分页）
 * ============================================================ */
export function useApiColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 44 },
    { field: 'id', title: 'ID', width: 70 },
    { field: 'name', title: '接口名', minWidth: 160 },
    { field: 'method', title: '方法', width: 90, slots: { default: 'method' } },
    { field: 'path', title: '路径', minWidth: 220 },
    { field: 'permissionCode', title: '权限码', minWidth: 160 },
    {
      field: 'apiGroup',
      title: '分组',
      width: 110,
      slots: { default: 'group' },
    },
    {
      field: 'isEnabled',
      title: '状态',
      width: 80,
      slots: { default: 'isEnabled' },
    },
    { field: 'createdAt', title: '创建时间', width: 170 },
    { title: '操作', fixed: 'right', width: 140, slots: { default: 'action' } },
  ];
}

/* ============================================================
 * 搜索 schema
 * ============================================================ */
export function useApiSearchSchema(): VbenFormProps['schema'] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '接口名',
      componentProps: { placeholder: '请输入' },
    },
    {
      component: 'Input',
      fieldName: 'path',
      label: '路径',
      componentProps: { placeholder: '如 /api/admin/users' },
    },
    {
      component: 'Select',
      fieldName: 'method',
      label: '方法',
      componentProps: {
        options: HTTP_METHOD_OPTIONS,
        clearable: true,
        placeholder: '全部',
      },
    },
    {
      component: 'Input',
      fieldName: 'group',
      label: '分组',
      componentProps: { placeholder: '如 用户管理' },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: '状态',
      componentProps: {
        options: API_STATUS_OPTIONS,
        clearable: true,
        placeholder: '全部',
      },
    },
  ];
}

/* ============================================================
 * 接口 form schema（抽屉内表单）
 * ============================================================ */
export function useApiFormSchema(): VbenFormProps['schema'] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '接口名',
      rules: z.string().min(1, '请输入接口名').max(64, '最长 64 字符'),
      componentProps: { placeholder: '展示用，如 用户分页列表' },
    },
    {
      component: 'Select',
      fieldName: 'method',
      label: 'HTTP 方法',
      defaultValue: 'GET',
      rules: z.string().min(1, '请选择 HTTP 方法'),
      componentProps: { options: HTTP_METHOD_OPTIONS },
    },
    {
      component: 'Input',
      fieldName: 'apiGroup',
      label: '分组',
      componentProps: { placeholder: '选已有或输入新分组，如 用户管理' },
    },
    {
      component: 'Input',
      fieldName: 'path',
      label: '路径',
      rules: z.string().min(1, '请输入路径'),
      componentProps: { placeholder: '如 /api/admin/users/:id' },
    },
    {
      component: 'Input',
      fieldName: 'permissionCode',
      label: '权限码',
      rules: z.string().min(1, '请输入权限码'),
      componentProps: { placeholder: '如 admin:user:list' },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      componentProps: { placeholder: '选填', rows: 3 },
    },
    {
      component: 'Switch',
      fieldName: 'isEnabled',
      label: '启用',
      defaultValue: 1,
    },
  ];
}
