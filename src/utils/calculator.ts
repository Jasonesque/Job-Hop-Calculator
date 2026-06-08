import type { CityData } from "../data/cities";

export interface CalculatorInputs {
  cityId: string;
  jobTitle: string;
  salary: number;            // 税前月薪 (RMB)
  bonus: number;             // 年终奖 (RMB)
  housingFundRate: number;   // 公积金缴存比例 (如 0.12)
  customRent: number;        // 自定义月租金/房贷 (RMB)
  customFood: number;        // 自定义每日伙食费 (RMB)
  customTransport: number;   // 自定义每日通勤/交通费 (RMB)
  customUtilities: number;   // 自定义水电杂费 (RMB)
  customLeisure: number;     // 自定义娱乐等其他开销 (RMB)
  workHours: number;         // 每日实际工作时长 (小时)
  commuteTime: number;       // 每日往返通勤时长 (小时)
  slackTime: number;         // 每日摸鱼/休息时长 (小时)
  specialTaxDeduction: number; // 专项附加扣除 (如租房、赡养老人等，默认 1500)
  careerGrowthRating: number;  // 职业成长空间打分 (1-5 颗星，默认 3)
}

export interface InsuranceBreakdown {
  pension: number;
  medical: number;
  unemployment: number;
  housingFund: number;
  totalEmployee: number;
  totalEmployer: number;
}

export interface CalculationResult {
  inputs: CalculatorInputs;
  city: CityData;
  grossAnnual: number;       // 税前年包
  netMonthly: number;        // 税后到手月薪
  netAnnual: number;         // 税后年包（包含年终奖税后）
  pension: number;
  medical: number;
  unemployment: number;
  housingFundEmployee: number;
  housingFundEmployer: number;
  totalFiveInsuranceOneFund: number;
  individualTaxMonthly: number;
  individualTaxAnnual: number; // 年终奖单独计税/合并计税后的总税额
  monthlyExpenses: number;   // 每月总生活开支
  monthlySavings: number;    // 每月结余 (到手薪资 + 住房公积金可支配部分 - 开支)
  annualSavings: number;     // 每年结余
  effectiveDailyCommitment: number; // 每日总绑定时长
  realHourlyRate: number;    // 真实税后时薪 (考虑公积金存留与生活成本后的净时薪)
  
  // 各维度评分 (0-100)
  scores: {
    takeHomePay: number;
    savingsPotential: number;
    costOfLiving: number;
    careerGrowth: number;
    workLifeBalance: number;
    totalWorth: number;
  };
}

/**
 * 计算五险一金
 */
export function calculateInsurance(
  salary: number,
  city: CityData,
  customFundRate: number
): InsuranceBreakdown {
  // 确定社保缴费基数 (介于下限和上限之间)
  const secBase = Math.max(city.secFloor, Math.min(city.secCap, salary));
  
  const pension = secBase * city.pensionRate;
  const medical = secBase * city.medicalRate;
  const unemployment = secBase * city.unemploymentRate;
  
  // 公积金缴存基数通常为上年度月均工资，此处近似为当月工资，但同样受到社保上下限约束 (或城市公积金单独上下限，此处简化取社保上下限)
  const fundBase = Math.max(city.secFloor, Math.min(city.secCap, salary));
  const housingFund = fundBase * customFundRate;
  
  const totalEmployee = pension + medical + unemployment + housingFund;
  
  // 单位缴纳部分近似计算 (养老16%, 医疗7%, 失业0.7%, 公积金等额)
  const totalEmployer = 
    fundBase * 0.16 + 
    fundBase * 0.07 + 
    fundBase * 0.007 + 
    fundBase * customFundRate;

  return {
    pension,
    medical,
    unemployment,
    housingFund,
    totalEmployee,
    totalEmployer,
  };
}

/**
 * 计算月度个税
 * 简化为月度个税累计计算的单月平均水平
 */
export function calculateMonthlyTax(
  salary: number,
  insuranceEmployee: number,
  specialTaxDeduction: number
): number {
  const taxThreshold = 5000;
  // 应纳税所得额
  const taxableIncome = salary - insuranceEmployee - taxThreshold - specialTaxDeduction;
  
  if (taxableIncome <= 0) return 0;
  
  // 简化的月度级距个税
  if (taxableIncome <= 3000) {
    return taxableIncome * 0.03;
  } else if (taxableIncome <= 12000) {
    return taxableIncome * 0.1 - 210;
  } else if (taxableIncome <= 25000) {
    return taxableIncome * 0.2 - 1410;
  } else if (taxableIncome <= 35000) {
    return taxableIncome * 0.25 - 2660;
  } else if (taxableIncome <= 55000) {
    return taxableIncome * 0.3 - 4410;
  } else if (taxableIncome <= 80000) {
    return taxableIncome * 0.35 - 7160;
  } else {
    return taxableIncome * 0.45 - 15160;
  }
}

/**
 * 计算年终奖税额 (单独计税方法)
 */
export function calculateBonusTax(bonus: number): number {
  if (bonus <= 0) return 0;
  const monthlyAverage = bonus / 12;
  
  let rate = 0;
  let quickDeduction = 0;
  
  if (monthlyAverage <= 3000) {
    rate = 0.03;
    quickDeduction = 0;
  } else if (monthlyAverage <= 12000) {
    rate = 0.1;
    quickDeduction = 210;
  } else if (monthlyAverage <= 25000) {
    rate = 0.2;
    quickDeduction = 1410;
  } else if (monthlyAverage <= 35000) {
    rate = 0.25;
    quickDeduction = 2660;
  } else if (monthlyAverage <= 55000) {
    rate = 0.3;
    quickDeduction = 4410;
  } else if (monthlyAverage <= 80000) {
    rate = 0.35;
    quickDeduction = 7160;
  } else {
    rate = 0.45;
    quickDeduction = 15160;
  }
  
  return Math.max(0, bonus * rate - quickDeduction);
}

/**
 * 核心计算流程
 */
export function runCalculation(
  inputs: CalculatorInputs,
  city: CityData
): CalculationResult {
  // 1. 五险一金
  const insurance = calculateInsurance(inputs.salary, city, inputs.housingFundRate);
  
  // 2. 个税
  const individualTaxMonthly = calculateMonthlyTax(
    inputs.salary,
    insurance.totalEmployee,
    inputs.specialTaxDeduction
  );
  
  // 3. 税后到手月薪
  const netMonthly = inputs.salary - insurance.totalEmployee - individualTaxMonthly;
  
  // 4. 年包与年税
  const grossAnnual = inputs.salary * 12 + inputs.bonus;
  const bonusTax = calculateBonusTax(inputs.bonus);
  const individualTaxAnnual = individualTaxMonthly * 12 + bonusTax;
  const netAnnual = netMonthly * 12 + (inputs.bonus - bonusTax);

  // 5. 每月生活成本开支
  const monthlyExpenses = 
    inputs.customRent + 
    (inputs.customFood * 30.5) + 
    (inputs.customTransport * 30.5) + 
    inputs.customUtilities + 
    inputs.customLeisure;

  // 6. 存款计算
  // 公积金（个人+单位）在买房或提取租房时相当于可支配存款，因此我们把它算作广义存款收益
  // 狭义存款 = 税后月薪 - 生活开支
  // 广义存款 = 狭义存款 + 公积金总和 (个人+单位)
  const totalMonthlyHousingFund = insurance.housingFund * 2; // 单位一比一配缴
  const monthlySavings = Math.max(0, netMonthly + totalMonthlyHousingFund - monthlyExpenses);
  const annualSavings = monthlySavings * 12 + (inputs.bonus - bonusTax); // 加上税后年终奖

  // 7. 真实时薪折算
  // 每日总绑定时长 = 工作时长 + 通勤时间 - 摸鱼时间 * 0.5
  // 我们将摸鱼时间折半扣除。如果每天在公司呆 9 小时，通勤 1.5 小时，摸鱼 1 小时，实际绑定时间 = 9 + 1.5 - 0.5 = 10 小时。
  const effectiveDailyCommitment = Math.max(
    4,
    inputs.workHours + inputs.commuteTime - inputs.slackTime * 0.5
  );
  
  // 真实税后时薪 = (月结余 + 生活成本对应的价值价值) / (工作日 * 绑定时间)
  // 此处使用 (税后月薪 + 个人公积金) / (21.75天 * 每日绑定时长) 比较符合直觉
  // 更合理的公式：将公积金视作收入，月实际总收入 = 税后月薪 + 个人公积金 + 公司公积金
  // 真实时薪 = 月实际总收入 / (21.75 * 每日绑定时长)
  const monthlyTotalRealIncome = netMonthly + totalMonthlyHousingFund;
  const realHourlyRate = monthlyTotalRealIncome / (21.75 * effectiveDailyCommitment);

  // 8. 评分维度计算 (0-100)
  // (1) 到手薪资评分: 5000RMB=20分, 25000RMB=100分
  const takeHomePayScore = Math.min(
    100,
    Math.max(10, 20 + ((netMonthly - 5000) / 20000) * 80)
  );

  // (2) 存钱潜力评分: 年度存款 0=10分, 150000RMB=100分
  const savingsPotentialScore = Math.min(
    100,
    Math.max(10, 10 + (annualSavings / 150000) * 90)
  );

  // (3) 生活成本评分: 指数越低（越省钱）评分越高。深圳=100为基准，Yongzhou=32.5。
  // 生活成本评分 = 100 - (开支 / 月收入) * 100 或者是基于城市指数
  // 此处使用 100 - 城市生活指数 * 0.6 (深圳得40分，广州得53分，长沙得69分，永州得80分)
  const costOfLivingScore = Math.min(100, Math.max(10, 110 - city.costOfLivingIndex * 0.7));

  // (4) 职业成长评分: 基于 1-5 星星
  const careerGrowthScore = inputs.careerGrowthRating * 20;

  // (5) 工作生活平衡 (WLB) 评分:
  // 每日实际绑定时间 8小时=100分, 13小时(如996+1.5h通勤)=40分, 每多一小时绑定扣除12分
  const wlbScore = Math.min(
    100,
    Math.max(10, 100 - Math.max(0, effectiveDailyCommitment - 8) * 12)
  );

  // (6) 综合性价比得分 (Job Worth Score)
  // 权重分配：WLB 25%, 到手薪资 25%, 存钱潜力 20%, 职业成长 15%, 生活成本 15%
  const totalWorth = Math.round(
    wlbScore * 0.25 +
    takeHomePayScore * 0.25 +
    savingsPotentialScore * 0.20 +
    careerGrowthScore * 0.15 +
    costOfLivingScore * 0.15
  );

  return {
    inputs,
    city,
    grossAnnual,
    netMonthly,
    netAnnual,
    pension: insurance.pension,
    medical: insurance.medical,
    unemployment: insurance.unemployment,
    housingFundEmployee: insurance.housingFund,
    housingFundEmployer: insurance.housingFund, // 假设一比一配缴
    totalFiveInsuranceOneFund: insurance.totalEmployee,
    individualTaxMonthly,
    individualTaxAnnual,
    monthlyExpenses,
    monthlySavings,
    annualSavings,
    effectiveDailyCommitment,
    realHourlyRate,
    scores: {
      takeHomePay: Math.round(takeHomePayScore),
      savingsPotential: Math.round(savingsPotentialScore),
      costOfLiving: Math.round(costOfLivingScore),
      careerGrowth: Math.round(careerGrowthScore),
      workLifeBalance: Math.round(wlbScore),
      totalWorth,
    },
  };
}
