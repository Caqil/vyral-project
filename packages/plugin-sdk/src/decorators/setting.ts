export interface SettingOptions {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'file' | 'color' | 'date';
  default?: any;
  description?: string;
  group?: string;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
}

export function Setting(options: SettingOptions) {
  return function (target: any, propertyKey: string) {
    if (!target.constructor._settings) {
      target.constructor._settings = [];
    }

    target.constructor._settings.push({
      ...options,
      property: propertyKey
    });
  };
}

export function TextSetting(key: string, label: string, options: Partial<SettingOptions> = {}) {
  return Setting({ ...options, key, label, type: 'text' });
}

export function BooleanSetting(key: string, label: string, defaultValue: boolean = false, options: Partial<SettingOptions> = {}) {
  return Setting({ ...options, key, label, type: 'boolean', default: defaultValue });
}

export function NumberSetting(key: string, label: string, defaultValue: number = 0, options: Partial<SettingOptions> = {}) {
  return Setting({ ...options, key, label, type: 'number', default: defaultValue });
}

export function SelectSetting(key: string, label: string, selectOptions: Array<{ label: string; value: any }>, options: Partial<SettingOptions> = {}) {
  return Setting({ ...options, key, label, type: 'select', options: selectOptions });
}