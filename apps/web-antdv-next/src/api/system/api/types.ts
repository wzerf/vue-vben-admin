/**
 * 接口管理 类型定义
 * 字段对齐 backend-mock-template 的 sys_api；软删 deletedAt: 0=未删
 */

export type HttpMethod =
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PUT';

export interface SysApi {
  id: number;
  name: string;
  method: HttpMethod;
  path: string;
  permissionCode: string;
  apiGroup: string;
  remark: string;
  isEnabled: 0 | 1;
  deletedAt: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface ApiListQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  path?: string;
  method?: HttpMethod;
  group?: string;
  status?: 0 | 1;
}

export interface CreateApiRequest {
  name: string;
  method: HttpMethod;
  path: string;
  permissionCode: string;
  apiGroup?: string;
  remark?: string;
  isEnabled?: 0 | 1;
}

export interface UpdateApiRequest {
  id: number;
  data: Partial<CreateApiRequest>;
}

export interface ApiBatchRequest {
  action: 'delete' | 'disable' | 'enable';
  ids: number[];
}

export interface ApiSyncResult {
  added: number;
  skipped: number;
  total: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
}
