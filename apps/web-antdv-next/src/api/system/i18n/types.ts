/**
 * I18n（i18n_locale / i18n_translation）类型定义
 * 字段对齐 backend-mock-template 的 schema；软删 deletedAt: 0=未删
 */

export interface I18nLocale {
  id: number;
  code: string;
  name: string;
  isDefault: 0 | 1;
  sort: number;
  remark: string;
  isEnabled: 0 | 1;
  deletedAt: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface I18nTranslation {
  id: number;
  localeId: number;
  translationKey: string;
  value: string;
  remark: string;
  isEnabled: 0 | 1;
  deletedAt: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
  /** 关联语言编码（仅 list 接口 join 后返回） */
  localeCode?: string;
}

export interface I18nLocaleQuery {
  page?: number;
  pageSize?: number;
  code?: string | string[];
  name?: string;
  status?: 0 | 1;
}

export interface I18nTranslationQuery {
  page?: number;
  pageSize?: number;
  localeId?: number;
  localeCode?: string;
  value?: string;
  status?: 0 | 1;
}

export interface CreateI18nLocaleRequest {
  code: string;
  name: string;
  sort?: number;
  remark?: string;
  isDefault?: 0 | 1;
  isEnabled?: 0 | 1;
}

export interface UpdateI18nLocaleRequest {
  id: number;
  code?: string;
  name?: string;
  sort?: number;
  remark?: string;
  isDefault?: 0 | 1;
  isEnabled?: 0 | 1;
}

export interface CreateI18nTranslationRequest {
  localeId: number;
  translationKey: string;
  value: string;
  remark?: string;
  isEnabled?: 0 | 1;
}

export interface UpdateI18nTranslationRequest {
  id: number;
  translationKey?: string;
  value?: string;
  remark?: string;
  isEnabled?: 0 | 1;
}

/**
 * 按 translation_key 聚合返回的多语言版本（GET /system/i18n-translation/by-key/:key）。
 */
export interface I18nTranslationByKeyValue {
  id: number;
  localeId: number;
  localeCode?: string;
  value: string;
  remark: string;
  isEnabled: 0 | 1;
}

export interface I18nTranslationByKeyResponse {
  translationKey: string;
  values: I18nTranslationByKeyValue[];
}

/**
 * 单 key 多语言事务化 upsert（POST /system/i18n-translation/batch-upsert-by-key）。
 */
export interface I18nTranslationBatchUpsertByKeyItem {
  localeId: number;
  value: string;
  remark?: string;
  isEnabled?: 0 | 1;
}

export interface I18nTranslationBatchUpsertByKeyRequest {
  translationKey: string;
  newTranslationKey?: string;
  items: I18nTranslationBatchUpsertByKeyItem[];
  deletedIds?: number[];
}

export interface I18nTranslationBatchUpsertError {
  code: string;
  message: string;
  localeId?: number;
  id?: number;
}

export interface I18nTranslationBatchUpsertByKeyResponse {
  ok: boolean;
  affected?: {
    created: number;
    deleted: number;
    renamed: number;
    updated: number;
  };
  values?: I18nTranslationByKeyValue[];
  errors?: I18nTranslationBatchUpsertError[];
}

export interface PageResult<T> {
  items: T[];
  total: number;
}
