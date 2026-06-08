import { createClient } from "@supabase/supabase-js";
import type { CalculatorInputs } from "./calculator";

const STORAGE_KEYS = {
  CURRENT_INPUTS: "jobhop_current_inputs",
  TARGET_INPUTS: "jobhop_target_inputs",
  SUPABASE_CONFIG: "jobhop_supabase_config",
  SUPABASE_SESSION: "jobhop_supabase_session",
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  userId?: string;
}

// 默认输入数据
export const defaultCurrentInputs: CalculatorInputs = {
  cityId: "yongzhou",
  jobTitle: "",
  salary: 0,
  bonus: 0,
  housingFundRate: 0.08,
  customRent: 0,
  customFood: 0,
  customTransport: 0,
  customUtilities: 0,
  customLeisure: 0,
  workHours: 8,
  commuteTime: 0,
  slackTime: 0,
  specialTaxDeduction: 0,
  careerGrowthRating: 3,
  pensionRate: 0.08,
  medicalRate: 0.02,
  unemploymentRate: 0.005,
};

export const defaultTargetInputs: CalculatorInputs = {
  cityId: "shenzhen",
  jobTitle: "",
  salary: 0,
  bonus: 0,
  housingFundRate: 0.12,
  customRent: 0,
  customFood: 0,
  customTransport: 0,
  customUtilities: 0,
  customLeisure: 0,
  workHours: 8,
  commuteTime: 0,
  slackTime: 0,
  specialTaxDeduction: 0,
  careerGrowthRating: 3,
  pensionRate: 0.08,
  medicalRate: 0.02,
  unemploymentRate: 0.005,
};

/**
 * 获取本地缓存数据
 */
export function getLocalInputs(): { current: CalculatorInputs; target: CalculatorInputs } {
  try {
    const cur = localStorage.getItem(STORAGE_KEYS.CURRENT_INPUTS);
    const tar = localStorage.getItem(STORAGE_KEYS.TARGET_INPUTS);
    return {
      current: cur ? { ...defaultCurrentInputs, ...JSON.parse(cur) } : defaultCurrentInputs,
      target: tar ? { ...defaultTargetInputs, ...JSON.parse(tar) } : defaultTargetInputs,
    };
  } catch (e) {
    return { current: defaultCurrentInputs, target: defaultTargetInputs };
  }
}

/**
 * 保存本地数据
 */
export function saveLocalInputs(current: CalculatorInputs, target: CalculatorInputs) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_INPUTS, JSON.stringify(current));
  localStorage.setItem(STORAGE_KEYS.TARGET_INPUTS, JSON.stringify(target));
}

/**
 * 获取 Supabase 配置
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    const configStr = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    return configStr ? JSON.parse(configStr) : null;
  } catch (e) {
    return null;
  }
}

/**
 * 保存 Supabase 配置
 */
export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
}

/**
 * 清除 Supabase 配置
 */
export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_CONFIG);
}

/**
 * 上传数据至 Supabase 云端
 */
export async function syncToCloud(
  current: CalculatorInputs,
  target: CalculatorInputs
): Promise<{ success: boolean; error?: string }> {
  const config = getSupabaseConfig();
  if (!config || !config.url || !config.anonKey) {
    return { success: false, error: "未配置 Supabase 云信息" };
  }

  try {
    const supabase = createClient(config.url, config.anonKey);
    const userId = config.userId || "anonymous_user";
    
    // 我们在云端保存数据，使用 upsert 方式更新同一个用户的数据
    // 表结构约定：id (text, pk), current_data (jsonb), target_data (jsonb), updated_at (timestamptz)
    const { error } = await supabase
      .from("jobhop_sync")
      .upsert({
        id: userId,
        current_data: current,
        target_data: target,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      // 如果表不存在，我们可以友好地捕获并返回提示，同时提示用户在 Supabase 创建对应的表
      if (error.code === "PGRST116" || error.message.includes("does not exist")) {
        return { 
          success: false, 
          error: "云端数据表 'jobhop_sync' 不存在，请先在 Supabase 运行 SQL 创建表：\n\ncreate table jobhop_sync (id text primary key, current_data jsonb, target_data jsonb, updated_at timestamptz);" 
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "未知连接错误" };
  }
}

/**
 * 从 Supabase 云端拉取数据
 */
export async function syncFromCloud(): Promise<{
  success: boolean;
  data?: { current: CalculatorInputs; target: CalculatorInputs };
  error?: string;
}> {
  const config = getSupabaseConfig();
  if (!config || !config.url || !config.anonKey) {
    return { success: false, error: "未配置 Supabase 云信息" };
  }

  try {
    const supabase = createClient(config.url, config.anonKey);
    const userId = config.userId || "anonymous_user";

    const { data, error } = await supabase
      .from("jobhop_sync")
      .select("current_data, target_data")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // 无数据
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    if (data && data.current_data && data.target_data) {
      return {
        success: true,
        data: {
          current: data.current_data as CalculatorInputs,
          target: data.target_data as CalculatorInputs,
        },
      };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "未知连接错误" };
  }
}
