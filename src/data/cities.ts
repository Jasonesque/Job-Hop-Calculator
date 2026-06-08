export interface CityData {
  id: string;
  name: string;
  province: string;
  avgSalary: number;      // 城市平均薪资 (RMB)
  secCap: number;         // 社保缴纳上限 (3倍平均薪资)
  secFloor: number;       // 社保缴纳下限 (60%平均薪资)
  pensionRate: number;    // 养老保险比例 (个人)
  medicalRate: number;    // 医疗保险比例 (个人)
  unemploymentRate: number; // 失业保险比例 (个人)
  housingFundRateDefault: number; // 默认公积金比例
  avgRent: number;        // 平均一居室月租金 (RMB)
  costOfLivingIndex: number; // 生活成本指数 (以深圳=100为基准)
  defaultDailyFood: number;  // 默认每日餐饮支出
  defaultDailyTransport: number; // 默认每日通勤/交通支出
  defaultMonthlyUtilities: number; // 默认水电宽带电话月度开支
  defaultMonthlyLeisure: number;   // 默认月度休闲娱乐开支
}

export const cities: CityData[] = [
  {
    id: "yongzhou",
    name: "永州",
    province: "湖南",
    avgSalary: 5200,
    secCap: 15600,
    secFloor: 3120,
    pensionRate: 0.08,
    medicalRate: 0.02,
    unemploymentRate: 0.005,
    housingFundRateDefault: 0.08,
    avgRent: 800,
    costOfLivingIndex: 32.5,
    defaultDailyFood: 30,
    defaultDailyTransport: 5,
    defaultMonthlyUtilities: 200,
    defaultMonthlyLeisure: 500,
  },
  {
    id: "changsha",
    name: "长沙",
    province: "湖南",
    avgSalary: 8800,
    secCap: 26400,
    secFloor: 5280,
    pensionRate: 0.08,
    medicalRate: 0.02,
    unemploymentRate: 0.005,
    housingFundRateDefault: 0.12,
    avgRent: 1800,
    costOfLivingIndex: 51.8,
    defaultDailyFood: 50,
    defaultDailyTransport: 10,
    defaultMonthlyUtilities: 300,
    defaultMonthlyLeisure: 1000,
  },
  {
    id: "guangzhou",
    name: "广州",
    province: "广东",
    avgSalary: 11200,
    secCap: 33600,
    secFloor: 6720,
    pensionRate: 0.08,
    medicalRate: 0.02,
    unemploymentRate: 0.002,
    housingFundRateDefault: 0.12,
    avgRent: 3200,
    costOfLivingIndex: 78.4,
    defaultDailyFood: 70,
    defaultDailyTransport: 15,
    defaultMonthlyUtilities: 400,
    defaultMonthlyLeisure: 1500,
  },
  {
    id: "shenzhen",
    name: "深圳",
    province: "广东",
    avgSalary: 12500,
    secCap: 37500,
    secFloor: 7500,
    pensionRate: 0.08,
    medicalRate: 0.02,
    unemploymentRate: 0.003,
    housingFundRateDefault: 0.12,
    avgRent: 4200,
    costOfLivingIndex: 100.0,
    defaultDailyFood: 80,
    defaultDailyTransport: 20,
    defaultMonthlyUtilities: 450,
    defaultMonthlyLeisure: 1800,
  }
];
