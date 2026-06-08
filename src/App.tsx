import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  PiggyBank,
  Activity,
  Share2,
  Download,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  RefreshCw,
  X,
  Sparkles,
  ChevronDown,
  Copy,
  QrCode,
  Database,
  Upload,
  User
} from "lucide-react";
import { cities } from "./data/cities";

import { runCalculation, calculateBonusTax } from "./utils/calculator";
import type { CalculationResult, CalculatorInputs } from "./utils/calculator";
import {
  getLocalInputs,
  saveLocalInputs,
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  syncToCloud,
  syncFromCloud,
} from "./utils/supabase";
import type { SupabaseConfig } from "./utils/supabase";

export default function App() {
  // --- State ---
  const [currentInputs, setCurrentInputs] = useState<CalculatorInputs>(getLocalInputs().current);
  const [targetInputs, setTargetInputs] = useState<CalculatorInputs>(getLocalInputs().target);
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Advanced settings panel states
  const [showCurrentAdvanced, setShowCurrentAdvanced] = useState(false);
  const [showTargetAdvanced, setShowTargetAdvanced] = useState(false);
  
  // Active city for Donut chart in control panel
  const [activeDonutCity, setActiveDonutCity] = useState<"current" | "target">("target");
  
  // Dropdowns for city selection
  const [showCurrentCityDropdown, setShowCurrentCityDropdown] = useState(false);
  const [showTargetCityDropdown, setShowTargetCityDropdown] = useState(false);
  
  // Supabase sync state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(getSupabaseConfig());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "success" | "error">("local");
  
  // Supabase modal form values
  const [sbUrl, setSbUrl] = useState(supabaseConfig?.url || "");
  const [sbKey, setSbKey] = useState(supabaseConfig?.anonKey || "");
  const [sbUserId, setSbUserId] = useState(supabaseConfig?.userId || "");

  // Notification Banner State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // User Profile States
  const [userName, setUserName] = useState(localStorage.getItem("jobhop_username") || "职场探索者");
  const [userAvatar, setUserAvatar] = useState(localStorage.getItem("jobhop_avatar") || "avatar1");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Avatar styles helpers
  const getAvatarGradient = (avatarKey: string) => {
    switch (avatarKey) {
      case "avatar1": return "linear-gradient(135deg, #00f0ff, #0072ff)";
      case "avatar2": return "linear-gradient(135deg, #d946ef, #8b5cf6)";
      case "avatar3": return "linear-gradient(135deg, #3b82f6, #ec4899)";
      case "avatar4": return "linear-gradient(135deg, #f59e0b, #ef4444)";
      case "avatar5": return "linear-gradient(135deg, #10b981, #059669)";
      case "avatar6": return "linear-gradient(135deg, #fbbf24, #d97706)";
      default: return "linear-gradient(135deg, #00f0ff, #0072ff)";
    }
  };

  const getAvatarIcon = (avatarKey: string, size = 16) => {
    switch (avatarKey) {
      case "avatar1": return <Sparkles size={size} />;
      case "avatar2": return <TrendingUp size={size} />;
      case "avatar3": return <MapPin size={size} />;
      case "avatar4": return <PiggyBank size={size} />;
      case "avatar5": return <Activity size={size} />;
      case "avatar6": return <LayoutDashboard size={size} />;
      default: return <Sparkles size={size} />;
    }
  };

  // URL Share Sync Import
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get("sb_url");
    const keyParam = params.get("sb_key");
    const uidParam = params.get("sb_uid");
    
    if (urlParam && keyParam) {
      const config: SupabaseConfig = {
        url: decodeURIComponent(urlParam),
        anonKey: decodeURIComponent(keyParam),
        userId: uidParam ? decodeURIComponent(uidParam) : "anonymous_user",
      };
      saveSupabaseConfig(config);
      setSupabaseConfig(config);
      setSbUrl(config.url);
      setSbKey(config.anonKey);
      setSbUserId(config.userId || "anonymous_user");
      showToast("检测到云端同步链接，正在导入配置并联通...", "success");
      
      // Pull data from cloud
      setSyncStatus("syncing");
      syncFromCloud().then(res => {
        if (res.success && res.data) {
          setCurrentInputs(res.data.current);
          setTargetInputs(res.data.target);
          showToast("云端同步通道已建立！数据加载成功。", "success");
          setSyncStatus("success");
        } else {
          // If no cloud data found, push local data to initialize
          syncToCloud(currentInputs, targetInputs).then(pRes => {
            if (pRes.success) {
              showToast("云端同步通道建立！已初始化云端数据。", "success");
              setSyncStatus("success");
            } else {
              showToast("同步连通测试失败：" + (pRes.error || "未知原因"), "error");
              setSyncStatus("error");
            }
          });
        }
      });
      // Clean query parameters to keep the URL clean
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // --- Calculations ---
  const currentCity = cities.find((c) => c.id === currentInputs.cityId) || cities[0];
  const targetCity = cities.find((c) => c.id === targetInputs.cityId) || cities[3];
  
  const currentResult = runCalculation(currentInputs, currentCity);
  const targetResult = runCalculation(targetInputs, targetCity);

  // --- Auto-Save ---
  useEffect(() => {
    saveLocalInputs(currentInputs, targetInputs);
    // Auto sync to cloud in background if configured
    if (supabaseConfig) {
      triggerBackgroundCloudSync();
    }
  }, [currentInputs, targetInputs]);

  // --- Effects ---
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Handlers ---
  const triggerBackgroundCloudSync = async () => {
    if (!supabaseConfig) return;
    setSyncStatus("syncing");
    const res = await syncToCloud(currentInputs, targetInputs);
    if (res.success) {
      setSyncStatus("success");
    } else {
      setSyncStatus("error");
    }
  };

  const handleCloudPull = async () => {
    if (!supabaseConfig) return;
    setSyncStatus("syncing");
    const res = await syncFromCloud();
    if (res.success) {
      if (res.data) {
        setCurrentInputs(res.data.current);
        setTargetInputs(res.data.target);
        showToast("已成功从云端同步最新配置！", "success");
        setSyncStatus("success");
      } else {
        showToast("云端没有找到保存的数据，已上传本地数据。", "success");
        await triggerBackgroundCloudSync();
      }
    } else {
      showToast(res.error || "拉取云端数据失败", "error");
      setSyncStatus("error");
    }
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl || !sbKey) {
      showToast("请完整填写 Supabase URL 和 Key", "error");
      return;
    }
    const config: SupabaseConfig = {
      url: sbUrl,
      anonKey: sbKey,
      userId: sbUserId || "anonymous_user",
    };
    saveSupabaseConfig(config);
    setSupabaseConfig(config);
    setIsSyncModalOpen(false);
    
    // Test sync
    setSyncStatus("syncing");
    const res = await syncToCloud(currentInputs, targetInputs);
    if (res.success) {
      showToast("Supabase 云同步配置成功并完成了首次同步！", "success");
      setSyncStatus("success");
    } else {
      showToast(res.error || "连接测试失败，请检查配置或表结构", "error");
      setSyncStatus("error");
    }
  };

  const handleClearSupabaseConfig = () => {
    clearSupabaseConfig();
    setSupabaseConfig(null);
    setSbUrl("");
    setSbKey("");
    setSbUserId("");
    setIsSyncModalOpen(false);
    setSyncStatus("local");
    showToast("已清除云同步配置，切换回本地存储模式", "success");
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const selectCurrentCity = (cityId: string) => {
    const selected = cities.find((c) => c.id === cityId);
    if (selected) {
      setCurrentInputs({
        ...currentInputs,
        cityId,
        customRent: selected.avgRent,
        customFood: selected.defaultDailyFood,
        customTransport: selected.defaultDailyTransport,
        customUtilities: selected.defaultMonthlyUtilities,
        customLeisure: selected.defaultMonthlyLeisure,
        pensionRate: selected.pensionRate,
        medicalRate: selected.medicalRate,
        unemploymentRate: selected.unemploymentRate,
        housingFundRate: selected.housingFundRateDefault,
      });
    }
    setShowCurrentCityDropdown(false);
  };

  const selectTargetCity = (cityId: string) => {
    const selected = cities.find((c) => c.id === cityId);
    if (selected) {
      setTargetInputs({
        ...targetInputs,
        cityId,
        customRent: selected.avgRent,
        customFood: selected.defaultDailyFood,
        customTransport: selected.defaultDailyTransport,
        customUtilities: selected.defaultMonthlyUtilities,
        customLeisure: selected.defaultMonthlyLeisure,
        pensionRate: selected.pensionRate,
        medicalRate: selected.medicalRate,
        unemploymentRate: selected.unemploymentRate,
        housingFundRate: selected.housingFundRateDefault,
      });
    }
    setShowTargetCityDropdown(false);
  };

  // --- Math/SVG Helpers ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(val);
  };

  const getWorthStatus = (score: number) => {
    if (score >= 80) return { label: "极力推荐跳槽！🚀", color: "var(--color-current)" };
    if (score >= 65) return { label: "不错的选择！📈", color: "var(--color-success)" };
    if (score >= 50) return { label: "性价比一般，谨慎考虑 ⚖️", color: "var(--color-warning)" };
    return { label: "不建议跳槽，得不偿失 ⚠️", color: "#ef4444" };
  };

  // Donut segment calculations with Leader Callout Lines
  const renderDonutChart = (result: CalculationResult, isCurrent: boolean) => {
    const rent = result.inputs.customRent;
    const food = result.inputs.customFood * 30.5;
    const transport = result.inputs.customTransport * 30.5;
    const utilities = result.inputs.customUtilities;
    const leisure = result.inputs.customLeisure;
    const total = rent + food + transport + utilities + leisure || 1;

    const categories = [
      { name: "租房/房贷", value: rent, color: isCurrent ? "var(--color-current)" : "var(--color-target)" },
      { name: "餐饮", value: food, color: "#10b981" },
      { name: "交通/通勤", value: transport, color: "#f59e0b" },
      { name: "水电宽带", value: utilities, color: "#3b82f6" },
      { name: "娱乐消遣", value: leisure, color: "#a855f7" },
    ];

    const activeCategories = categories.filter((c) => c.value > 0);
    const radius = 50;
    const circ = 2 * Math.PI * radius; // ~314.16

    const cx = 210;
    const cy = 110;

    let cumulativePercent = 0;

    return (
      <div className="chart-wrapper" style={{ flexDirection: "column", gap: "10px", width: "100%", alignItems: "center" }}>
        <svg viewBox="0 0 420 220" style={{ width: "100%", height: "auto", maxWidth: "420px", overflow: "visible" }}>
          {/* Inner Shadow / Base Ring */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />

          {activeCategories.map((cat, idx) => {
            const percent = cat.value / total;
            const strokeLength = percent * circ;
            const strokeOffset = circ - strokeLength;
            
            // rotateAngle is where this slice starts in degrees
            const rotateAngle = cumulativePercent * 360;
            
            // midpoint angle in degrees
            const midAngleDegrees = rotateAngle + (percent * 360) / 2;
            const midAngleRadians = (midAngleDegrees * Math.PI) / 180;

            // increment cumulativePercent for the next slice
            cumulativePercent += percent;

            // midpoint on the donut circle path
            const x_mid = cx + radius * Math.cos(midAngleRadians);
            const y_mid = cy + radius * Math.sin(midAngleRadians);

            // elbow point for the callout line (radius 76)
            const x_elbow = cx + 76 * Math.cos(midAngleRadians);
            const y_elbow = cy + 76 * Math.sin(midAngleRadians);

            const isLeft = x_elbow < cx;
            const x_end = isLeft ? 55 : 365;
            const textX = isLeft ? 45 : 375;
            const textAnchor = isLeft ? "end" : "start";

            const percentLabel = Math.round(percent * 100);

            return (
              <g key={idx}>
                {/* Donut Slice */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth="12"
                  strokeDasharray={`${strokeLength} ${strokeOffset}`}
                  strokeDashoffset={0}
                  transform={`rotate(${rotateAngle} ${cx} ${cy})`}
                  style={{ transition: "stroke-dasharray 0.5s ease" }}
                />

                {/* Callout Line */}
                <path
                  d={`M ${x_mid} ${y_mid} L ${x_elbow} ${y_elbow} L ${x_end} ${y_elbow}`}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth="1.2"
                  strokeOpacity="0.7"
                  strokeDasharray="none"
                  style={{ transition: "all 0.5s ease" }}
                />

                {/* Inner Indicator Dot on donut edge */}
                <circle
                  cx={x_mid}
                  cy={y_mid}
                  r="2"
                  fill={cat.color}
                  style={{ transition: "all 0.5s ease" }}
                />

                {/* Outer Indicator Dot on elbow */}
                <circle
                  cx={x_elbow}
                  cy={y_elbow}
                  r="2.5"
                  fill={cat.color}
                  style={{ transition: "all 0.5s ease" }}
                />

                {/* Label Text */}
                <text
                  x={textX}
                  y={y_elbow + 4}
                  textAnchor={textAnchor}
                  fill="var(--text-primary)"
                  fontSize="11px"
                  fontWeight="600"
                  style={{ transition: "all 0.5s ease" }}
                >
                  {cat.name}
                </text>
                <text
                  x={textX}
                  y={y_elbow + 16}
                  textAnchor={textAnchor}
                  fill="var(--text-muted)"
                  fontSize="10px"
                  style={{ transition: "all 0.5s ease" }}
                >
                  {`${percentLabel}% (${formatCurrency(cat.value)})`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // (generateSparkline was removed to resolve compilation warnings)

  // SVG Gauge Calculations
  const radius = 85;
  const circ = Math.PI * radius; // 267.04 (Semi-circle circum)
  const diffWorth = targetResult.scores.totalWorth;
  const strokeDashoffset = circ - (diffWorth / 100) * circ;
  const worthStatus = getWorthStatus(diffWorth);

  // Compare 5 years savings calculation
  const current5YearSavings = [0, ...Array.from({ length: 5 }, (_, i) => currentResult.annualSavings * (i + 1))];
  const target5YearSavings = [0, ...Array.from({ length: 5 }, (_, i) => targetResult.annualSavings * (i + 1))];
  const maxSavings5Year = Math.max(...target5YearSavings, ...current5YearSavings, 1);

  // Simple copy share link
  const handleShare = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?currentCity=${currentInputs.cityId}&currentSalary=${currentInputs.salary}&targetCity=${targetInputs.cityId}&targetSalary=${targetInputs.salary}`;
    navigator.clipboard.writeText(shareUrl);
    showToast("已复制分享链接到剪贴板！扫码或发送给他人即可导入当前对比。", "success");
  };

  // Simple JSON export
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ current: currentInputs, target: targetInputs }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jobhop_compare_${currentCity.name}_vs_${targetCity.name}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("成功导出对比数据 JSON 文件！", "success");
  };

  // Profile data Backup & Restore handlers
  const handleExportAll = () => {
    const backup = {
      username: userName,
      avatar: userAvatar,
      current: currentInputs,
      target: targetInputs,
      supabaseConfig: supabaseConfig
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobhop_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("备份已成功导出为 JSON 文件！", "success");
  };

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.current && data.target) {
          if (data.username) {
            setUserName(data.username);
            localStorage.setItem("jobhop_username", data.username);
          }
          if (data.avatar) {
            setUserAvatar(data.avatar);
            localStorage.setItem("jobhop_avatar", data.avatar);
          }
          setCurrentInputs(data.current);
          setTargetInputs(data.target);
          if (data.supabaseConfig) {
            saveSupabaseConfig(data.supabaseConfig);
            setSupabaseConfig(data.supabaseConfig);
            setSbUrl(data.supabaseConfig.url || "");
            setSbKey(data.supabaseConfig.anonKey || "");
            setSbUserId(data.supabaseConfig.userId || "");
          }
          showToast("已成功载入备份配置与数据！", "success");
        } else {
          showToast("无效的备份文件结构！", "error");
        }
      } catch (error) {
        showToast("解析备份文件失败，请检查文件格式！", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (window.confirm("确定要清除全部本地数据与云同步配置吗？您的本地数据将恢复至默认，此操作不可撤销。")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: toast.type === "success" ? "rgba(16, 185, 129, 0.95)" : "rgba(239, 68, 68, 0.95)",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          zIndex: 9999,
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          backdropFilter: "blur(4px)",
          fontSize: "14px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.message}
        </div>
      )}

      {/* 1. Sidebar Nav */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Activity size={24} style={{ color: "var(--color-target)" }} />
          <span>JobHop</span>
        </div>
        <ul className="sidebar-menu">
          <li>
            <a href="#" className={`menu-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
              <LayoutDashboard size={18} />
              控制面板 (Dashboard)
            </a>
          </li>
          <li>
            <a href="#" className={`menu-item ${activeTab === "city-compare" ? "active" : ""}`} onClick={() => setActiveTab("city-compare")}>
              <MapPin size={18} />
              城市物价 (Cost of Living)
            </a>
          </li>
          <li>
            <a href="#" className={`menu-item ${activeTab === "salary-analyzer" ? "active" : ""}`} onClick={() => setActiveTab("salary-analyzer")}>
              <TrendingUp size={18} />
              薪资分析 (Salary Analyzer)
            </a>
          </li>
          <li>
            <a href="#" className={`menu-item ${activeTab === "savings-forecast" ? "active" : ""}`} onClick={() => setActiveTab("savings-forecast")}>
              <PiggyBank size={18} />
              存款预测 (Savings Forecast)
            </a>
          </li>
          <li>
            <a href="#" className={`menu-item ${activeTab === "sync-panel" ? "active" : ""}`} onClick={() => { setActiveTab("sync-panel"); setIsSyncModalOpen(true); }}>
              <RefreshCw size={18} />
              云端同步 (Cloud Sync)
            </a>
          </li>
        </ul>

        {/* Promo Upgrade */}
        <div className="sidebar-promo">
          <h4>Plan Your Best Move</h4>
          <p>对比各项福利与时薪，避开虚假高薪，做出更明智的跳槽决策。</p>
          <button className="sidebar-promo-btn" onClick={() => setIsSyncModalOpen(true)}>
            <Sparkles size={14} />
            {supabaseConfig ? "云端同步中" : "配置 Supabase 同步"}
          </button>
        </div>

        {/* User profile section */}
        <div className="sidebar-user" onClick={() => setIsProfileModalOpen(true)} title="点击打开个人中心与数据管理">
          <div className="user-avatar-gradient" style={{ background: getAvatarGradient(userAvatar) }}>
            {getAvatarIcon(userAvatar, 18)}
          </div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-status" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: syncStatus === "success" ? "var(--color-success)" : syncStatus === "syncing" ? "var(--color-warning)" : "var(--text-muted)",
                boxShadow: syncStatus === "success" ? "0 0 8px var(--color-success)" : "none"
              }}></span>
              {supabaseConfig ? "云端同步在线" : "本地模式"}
            </span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="header-title">
            <h1>Job Hop & Cost of Living Calculator</h1>
            <p>通过折算时薪、五险一金和城市生活成本，精准比较新老工作的真实性价比。</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={handleShare}>
              <Share2 size={15} />
              分享对比
            </button>
            <button className="btn-secondary" onClick={handleExport}>
              <Download size={15} />
              导出 JSON
            </button>
            {supabaseConfig && (
              <button className="btn-secondary" style={{ borderColor: "rgba(16, 185, 129, 0.4)" }} onClick={handleCloudPull}>
                <RefreshCw size={15} className={syncStatus === "syncing" ? "spin-animation" : ""} />
                从云端拉取
              </button>
            )}
          </div>
        </header>

        {/* Tab-based Main Content rendering */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            
            {/* Top Panel: Sliders & Gauge Side-by-Side */}
            <div className="top-dashboard-row">
              
              {/* Comparison Cards Panel */}
              <div className="city-compare-container">
                <div className="vs-badge">VS</div>
                
                {/* CURRENT CITY CARD */}
                <div className="glass-card city-card current">
                  <div className="city-card-header">
                    <div className="city-meta">
                      <span className="city-label">当前城市 / Current City</span>
                      <h2 className="city-name" onClick={() => setShowCurrentCityDropdown(!showCurrentCityDropdown)} style={{ cursor: "pointer" }}>
                        {currentCity.name} <ChevronDown size={18} style={{ opacity: 0.5 }} />
                      </h2>
                      <input
                        type="text"
                        className="job-title-input"
                        value={currentInputs.jobTitle}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, jobTitle: e.target.value })}
                        placeholder="职位名称"
                      />
                    </div>
                    <span className="spec-value" style={{ color: "var(--color-current)" }}>当前 Offer</span>
                  </div>

                  {/* Dropdown overlay */}
                  {showCurrentCityDropdown && (
                    <>
                      <div className="city-dropdown-overlay" onClick={() => setShowCurrentCityDropdown(false)}></div>
                      <ul className="city-dropdown" style={{ top: "60px", left: "20px" }}>
                        {cities.map((c) => (
                          <li key={c.id} onClick={() => selectCurrentCity(c.id)}>
                            {c.province} - {c.name}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="city-specs">
                    <div className="spec-item">
                      <span className="spec-label">房租平均</span>
                      <span className="spec-value">{formatCurrency(currentCity.avgRent)}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">物价指数</span>
                      <span className="spec-value">{currentCity.costOfLivingIndex}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">社保基数</span>
                      <span className="spec-value">{formatCurrency(currentCity.avgSalary)}</span>
                    </div>
                  </div>

                  {/* Sliders current */}
                  <div className="sliders-group">
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">税前月薪 (Gross Salary)</span>
                        <span className="slider-value">{formatCurrency(currentInputs.salary)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="500"
                        className="custom-range"
                        value={currentInputs.salary}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, salary: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">年终奖金 (Annual Bonus)</span>
                        <span className="slider-value">{formatCurrency(currentInputs.bonus)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="300000"
                        step="1000"
                        className="custom-range"
                        value={currentInputs.bonus}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, bonus: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">月房租/房贷支出 (Rent/Mortgage)</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customRent)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20000"
                        step="100"
                        className="custom-range"
                        value={currentInputs.customRent}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customRent: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">日常伙食费 (Daily Food / Day)</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customFood)} / 天</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="300"
                        step="5"
                        className="custom-range"
                        value={currentInputs.customFood}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customFood: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">通勤交通开销 (Daily Transport)</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customTransport)} / 天</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="5"
                        className="custom-range"
                        value={currentInputs.customTransport}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customTransport: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">水电宽带月杂费 (Utilities)</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customUtilities)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3000"
                        step="50"
                        className="custom-range"
                        value={currentInputs.customUtilities}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customUtilities: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">社交娱乐消遣 (Monthly Leisure)</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customLeisure)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        className="custom-range"
                        value={currentInputs.customLeisure}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customLeisure: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每日工作时长 (Work Hours)</span>
                        <span className="slider-value">{currentInputs.workHours} 小时</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="16"
                        step="0.5"
                        className="custom-range"
                        value={currentInputs.workHours}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, workHours: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">往返通勤时长 (Commute Hours)</span>
                        <span className="slider-value">{currentInputs.commuteTime} 小时</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="0.1"
                        className="custom-range"
                        value={currentInputs.commuteTime}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, commuteTime: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Current City Advanced Settings */}
                  <button 
                    className="advanced-toggle"
                    onClick={() => setShowCurrentAdvanced(!showCurrentAdvanced)}
                  >
                    <Sparkles size={14} />
                    {showCurrentAdvanced ? "收起高级社保与扣除设置" : "展开高级社保与扣除设置"}
                  </button>
                  {showCurrentAdvanced && (
                    <div className="advanced-panel">
                      {/* pensionRate */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">养老保险个人比例</span>
                          <span className="slider-value">{(currentInputs.pensionRate * 100).toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.15"
                          step="0.005"
                          className="custom-range"
                          value={currentInputs.pensionRate}
                          onChange={(e) => setCurrentInputs({ ...currentInputs, pensionRate: Number(e.target.value) })}
                        />
                      </div>

                      {/* medicalRate */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">医疗保险个人比例</span>
                          <span className="slider-value">{(currentInputs.medicalRate * 100).toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.06"
                          step="0.005"
                          className="custom-range"
                          value={currentInputs.medicalRate}
                          onChange={(e) => setCurrentInputs({ ...currentInputs, medicalRate: Number(e.target.value) })}
                        />
                      </div>

                      {/* unemploymentRate */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">失业保险个人比例</span>
                          <span className="slider-value">{(currentInputs.unemploymentRate * 100).toFixed(2)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.02"
                          step="0.0005"
                          className="custom-range"
                          value={currentInputs.unemploymentRate}
                          onChange={(e) => setCurrentInputs({ ...currentInputs, unemploymentRate: Number(e.target.value) })}
                        />
                      </div>

                      {/* housingFundRate */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">公积金个人缴存比例</span>
                          <span className="slider-value">{(currentInputs.housingFundRate * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.12"
                          step="0.01"
                          className="custom-range"
                          value={currentInputs.housingFundRate}
                          onChange={(e) => setCurrentInputs({ ...currentInputs, housingFundRate: Number(e.target.value) })}
                        />
                      </div>

                      {/* specialTaxDeduction */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">个税专项附加扣除</span>
                          <span className="slider-value">¥{currentInputs.specialTaxDeduction}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="8000"
                          step="100"
                          className="custom-range"
                          value={currentInputs.specialTaxDeduction}
                          onChange={(e) => setCurrentInputs({ ...currentInputs, specialTaxDeduction: Number(e.target.value) })}
                        />
                      </div>

                      {/* slackTime */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">每日摸鱼/休息时长</span>
                          <span className="slider-value">{currentInputs.slackTime} 小时</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="6"
                          step="0.5"
                          className="custom-range"
                          value={currentInputs.slackTime}
                          onChange={(e) => setCurrentInputs({ ...currentInputs, slackTime: Number(e.target.value) })}
                        />
                      </div>

                      {/* careerGrowthRating */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">职业成长空间评分</span>
                          <span className="slider-value">{currentInputs.careerGrowthRating} 星</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          className="custom-range"
                          value={currentInputs.careerGrowthRating}
                          onChange={(e) => setCurrentInputs({ ...currentInputs, careerGrowthRating: Number(e.target.value) })}
                        />
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.4" }}>
                          职业成长评分通过 1-5 星评分折算。计算公式为：成长评分 × 20 (当前折算得分: {currentInputs.careerGrowthRating * 20}/100)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TARGET CITY CARD */}
                <div className="glass-card city-card target">
                  <div className="city-card-header">
                    <div className="city-meta">
                      <span className="city-label">目标城市 / Target City</span>
                      <h2 className="city-name" onClick={() => setShowTargetCityDropdown(!showTargetCityDropdown)} style={{ cursor: "pointer" }}>
                        {targetCity.name} <ChevronDown size={18} style={{ opacity: 0.5 }} />
                      </h2>
                      <input
                        type="text"
                        className="job-title-input"
                        value={targetInputs.jobTitle}
                        onChange={(e) => setTargetInputs({ ...targetInputs, jobTitle: e.target.value })}
                        placeholder="职位名称"
                      />
                    </div>
                    <span className="spec-value" style={{ color: "var(--color-target)" }}>跳槽 Offer</span>
                  </div>

                  {/* Dropdown overlay */}
                  {showTargetCityDropdown && (
                    <>
                      <div className="city-dropdown-overlay" onClick={() => setShowTargetCityDropdown(false)}></div>
                      <ul className="city-dropdown" style={{ top: "60px", left: "20px" }}>
                        {cities.map((c) => (
                          <li key={c.id} onClick={() => selectTargetCity(c.id)}>
                            {c.province} - {c.name}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="city-specs">
                    <div className="spec-item">
                      <span className="spec-label">房租平均</span>
                      <span className="spec-value">{formatCurrency(targetCity.avgRent)}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">物价指数</span>
                      <span className="spec-value">{targetCity.costOfLivingIndex}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">社保基数</span>
                      <span className="spec-value">{formatCurrency(targetCity.avgSalary)}</span>
                    </div>
                  </div>

                  {/* Sliders target */}
                  <div className="sliders-group">
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">税前月薪 (Gross Salary)</span>
                        <span className="slider-value">{formatCurrency(targetInputs.salary)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="500"
                        className="custom-range"
                        value={targetInputs.salary}
                        onChange={(e) => setTargetInputs({ ...targetInputs, salary: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">年终奖金 (Annual Bonus)</span>
                        <span className="slider-value">{formatCurrency(targetInputs.bonus)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="300000"
                        step="1000"
                        className="custom-range"
                        value={targetInputs.bonus}
                        onChange={(e) => setTargetInputs({ ...targetInputs, bonus: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">月房租/房贷支出 (Rent/Mortgage)</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customRent)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20000"
                        step="100"
                        className="custom-range"
                        value={targetInputs.customRent}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customRent: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">日常伙食费 (Daily Food / Day)</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customFood)} / 天</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="300"
                        step="5"
                        className="custom-range"
                        value={targetInputs.customFood}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customFood: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">通勤交通开销 (Daily Transport)</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customTransport)} / 天</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="5"
                        className="custom-range"
                        value={targetInputs.customTransport}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customTransport: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">水电宽带月杂费 (Utilities)</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customUtilities)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3000"
                        step="50"
                        className="custom-range"
                        value={targetInputs.customUtilities}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customUtilities: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">社交娱乐消遣 (Monthly Leisure)</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customLeisure)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        className="custom-range"
                        value={targetInputs.customLeisure}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customLeisure: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每日工作时长 (Work Hours)</span>
                        <span className="slider-value">{targetInputs.workHours} 小时</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="16"
                        step="0.5"
                        className="custom-range"
                        value={targetInputs.workHours}
                        onChange={(e) => setTargetInputs({ ...targetInputs, workHours: Number(e.target.value) })}
                      />
                    </div>

                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">往返通勤时长 (Commute Hours)</span>
                        <span className="slider-value">{targetInputs.commuteTime} 小时</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="0.1"
                        className="custom-range"
                        value={targetInputs.commuteTime}
                        onChange={(e) => setTargetInputs({ ...targetInputs, commuteTime: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Target City Advanced Settings */}
                  <button 
                    className="advanced-toggle"
                    onClick={() => setShowTargetAdvanced(!showTargetAdvanced)}
                  >
                    <Sparkles size={14} />
                    {showTargetAdvanced ? "收起高级社保与扣除设置" : "展开高级社保与扣除设置"}
                  </button>
                  {showTargetAdvanced && (
                    <div className="advanced-panel">
                      {/* pensionRate */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">养老保险个人比例</span>
                          <span className="slider-value">{(targetInputs.pensionRate * 100).toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.15"
                          step="0.005"
                          className="custom-range"
                          value={targetInputs.pensionRate}
                          onChange={(e) => setTargetInputs({ ...targetInputs, pensionRate: Number(e.target.value) })}
                        />
                      </div>

                      {/* medicalRate */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">医疗保险个人比例</span>
                          <span className="slider-value">{(targetInputs.medicalRate * 100).toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.06"
                          step="0.005"
                          className="custom-range"
                          value={targetInputs.medicalRate}
                          onChange={(e) => setTargetInputs({ ...targetInputs, medicalRate: Number(e.target.value) })}
                        />
                      </div>

                      {/* unemploymentRate */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">失业保险个人比例</span>
                          <span className="slider-value">{(targetInputs.unemploymentRate * 100).toFixed(2)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.02"
                          step="0.0005"
                          className="custom-range"
                          value={targetInputs.unemploymentRate}
                          onChange={(e) => setTargetInputs({ ...targetInputs, unemploymentRate: Number(e.target.value) })}
                        />
                      </div>

                      {/* housingFundRate */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">公积金个人缴存比例</span>
                          <span className="slider-value">{(targetInputs.housingFundRate * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.12"
                          step="0.01"
                          className="custom-range"
                          value={targetInputs.housingFundRate}
                          onChange={(e) => setTargetInputs({ ...targetInputs, housingFundRate: Number(e.target.value) })}
                        />
                      </div>

                      {/* specialTaxDeduction */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">个税专项附加扣除</span>
                          <span className="slider-value">¥{targetInputs.specialTaxDeduction}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="8000"
                          step="100"
                          className="custom-range"
                          value={targetInputs.specialTaxDeduction}
                          onChange={(e) => setTargetInputs({ ...targetInputs, specialTaxDeduction: Number(e.target.value) })}
                        />
                      </div>

                      {/* slackTime */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">每日摸鱼/休息时长</span>
                          <span className="slider-value">{targetInputs.slackTime} 小时</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="6"
                          step="0.5"
                          className="custom-range"
                          value={targetInputs.slackTime}
                          onChange={(e) => setTargetInputs({ ...targetInputs, slackTime: Number(e.target.value) })}
                        />
                      </div>

                      {/* careerGrowthRating */}
                      <div className="slider-container">
                        <div className="slider-label-row">
                          <span className="slider-label">职业成长空间评分</span>
                          <span className="slider-value">{targetInputs.careerGrowthRating} 星</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          className="custom-range"
                          value={targetInputs.careerGrowthRating}
                          onChange={(e) => setTargetInputs({ ...targetInputs, careerGrowthRating: Number(e.target.value) })}
                        />
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.4" }}>
                          职业成长评分通过 1-5 星评分折算。计算公式为：成长评分 × 20 (当前折算得分: {targetInputs.careerGrowthRating * 20}/100)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Job Worth Score Gauge Card */}
              <div className="glass-card job-worth-card">
                <span className="worth-card-title">
                  工作性价比指数 (Job Worth Score)
                  <div className="tooltip-container">
                    <Info size={14} style={{ color: "var(--text-muted)", cursor: "pointer" }} />
                    <div className="tooltip-text">
                      工作性价比指数是综合考虑工作生活平衡 (25%)、税后到手收入 (25%)、存钱净空间 (20%)、职业成长空间 (15%) 和生活成本 (15%) 计算出的综合得分。
                    </div>
                  </div>
                </span>

                <div className="worth-gauge-wrapper">
                  <svg className="gauge-svg" viewBox="0 0 200 115">
                    <path className="gauge-bg" d="M 15,100 A 85,85 0 0,1 185,100" />
                    <path
                      className="gauge-fill"
                      d="M 15,100 A 85,85 0 0,1 185,100"
                      stroke="url(#worth-grad)"
                      strokeDasharray={circ}
                      strokeDashoffset={strokeDashoffset}
                    />
                    <defs>
                      <linearGradient id="worth-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--color-current)" />
                        <stop offset="100%" stopColor="var(--color-target)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="gauge-text">
                    <span className="gauge-score">{diffWorth}</span>
                    <span className="gauge-max">/100</span>
                    <span className="gauge-status" style={{ color: worthStatus.color }}>
                      {worthStatus.label}
                    </span>
                  </div>
                </div>

                {/* Worth parameters breakdown */}
                <div className="worth-metrics-list">
                  <div className="worth-metric-row">
                    <div className="worth-metric-info">
                      <span>税后到手收入 (Take-Home Pay)</span>
                      <span>{targetResult.scores.takeHomePay}/100</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${targetResult.scores.takeHomePay}%` }}></div>
                    </div>
                  </div>

                  <div className="worth-metric-row">
                    <div className="worth-metric-info">
                      <span>存钱净空间 (Savings Potential)</span>
                      <span>{targetResult.scores.savingsPotential}/100</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${targetResult.scores.savingsPotential}%` }}></div>
                    </div>
                  </div>

                  <div className="worth-metric-row">
                    <div className="worth-metric-info">
                      <span>生活开销指数 (Cost of Living)</span>
                      <span>{targetResult.scores.costOfLiving}/100</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${targetResult.scores.costOfLiving}%` }}></div>
                    </div>
                  </div>

                  <div className="worth-metric-row">
                    <div className="worth-metric-info">
                      <span>职业成长空间 (Career Growth)</span>
                      <span>{targetResult.scores.careerGrowth}/100</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${targetResult.scores.careerGrowth}%` }}></div>
                    </div>
                  </div>

                  <div className="worth-metric-row">
                    <div className="worth-metric-info">
                      <span>工作生活平衡 (Work-Life Balance)</span>
                      <span>{targetResult.scores.workLifeBalance}/100</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${targetResult.scores.workLifeBalance}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Compare Savings Text Box */}
                <div className="savings-highlight">
                  <span>跳槽后每年可多存</span>
                  <span className="savings-highlight-val">
                    {targetResult.annualSavings > currentResult.annualSavings
                      ? `+${formatCurrency(targetResult.annualSavings - currentResult.annualSavings)}`
                      : formatCurrency(targetResult.annualSavings - currentResult.annualSavings)}
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "normal" }}> / 年</span>
                  </span>
                </div>
              </div>

            </div>

            {/* 3. Small Mini Cards Row */}
            <div className="metrics-row">
              {/* Net take-home pay card */}
              <div className="glass-card metric-mini-card">
                <span className="mini-card-label">到手月收入 (税后)</span>
                <div className="mini-card-values">
                  <div className="mini-card-current-col">
                    <span>{formatCurrency(currentResult.netMonthly)}</span>
                    <span className="mini-card-city-name">{currentCity.name}</span>
                  </div>
                  <div className="mini-card-target-col">
                    <span>{formatCurrency(targetResult.netMonthly)}</span>
                    <span className="mini-card-city-name">{targetCity.name}</span>
                  </div>
                </div>
                <span className={`mini-card-trend ${targetResult.netMonthly >= currentResult.netMonthly ? "up" : "down"}`}>
                  {targetResult.netMonthly >= currentResult.netMonthly ? (
                    <>
                      <ArrowUpRight size={14} />
                      {`+${((targetResult.netMonthly / currentResult.netMonthly - 1) * 100).toFixed(1)}%`}
                    </>
                  ) : (
                    <>
                      <ArrowDownRight size={14} />
                      {`${((targetResult.netMonthly / currentResult.netMonthly - 1) * 100).toFixed(1)}%`}
                    </>
                  )}
                </span>
              </div>

              {/* Monthly Savings card */}
              <div className="glass-card metric-mini-card">
                <span className="mini-card-label">月存钱结余 (含公积金)</span>
                <div className="mini-card-values">
                  <div className="mini-card-current-col">
                    <span>{formatCurrency(currentResult.monthlySavings)}</span>
                    <span className="mini-card-city-name">{currentCity.name}</span>
                  </div>
                  <div className="mini-card-target-col">
                    <span>{formatCurrency(targetResult.monthlySavings)}</span>
                    <span className="mini-card-city-name">{targetCity.name}</span>
                  </div>
                </div>
                <span className={`mini-card-trend ${targetResult.monthlySavings >= currentResult.monthlySavings ? "up" : "down"}`}>
                  {targetResult.monthlySavings >= currentResult.monthlySavings ? (
                    <>
                      <ArrowUpRight size={14} />
                      {`+${((targetResult.monthlySavings / currentResult.monthlySavings - 1) * 100).toFixed(1)}%`}
                    </>
                  ) : (
                    <>
                      <ArrowDownRight size={14} />
                      {`${((targetResult.monthlySavings / currentResult.monthlySavings - 1) * 100).toFixed(1)}%`}
                    </>
                  )}
                </span>
              </div>

              {/* Annual Savings card */}
              <div className="glass-card metric-mini-card">
                <span className="mini-card-label">年存款结余 (含年终奖)</span>
                <div className="mini-card-values">
                  <div className="mini-card-current-col">
                    <span>{formatCurrency(currentResult.annualSavings)}</span>
                    <span className="mini-card-city-name">{currentCity.name}</span>
                  </div>
                  <div className="mini-card-target-col">
                    <span>{formatCurrency(targetResult.annualSavings)}</span>
                    <span className="mini-card-city-name">{targetCity.name}</span>
                  </div>
                </div>
                <span className={`mini-card-trend ${targetResult.annualSavings >= currentResult.annualSavings ? "up" : "down"}`}>
                  {targetResult.annualSavings >= currentResult.annualSavings ? (
                    <>
                      <ArrowUpRight size={14} />
                      {`+${((targetResult.annualSavings / currentResult.annualSavings - 1) * 100).toFixed(1)}%`}
                    </>
                  ) : (
                    <>
                      <ArrowDownRight size={14} />
                      {`${((targetResult.annualSavings / currentResult.annualSavings - 1) * 100).toFixed(1)}%`}
                    </>
                  )}
                </span>
              </div>

              {/* Real Hourly Wage card */}
              <div className="glass-card metric-mini-card">
                <span className="mini-card-label">折算真实时薪 (税后)</span>
                <div className="mini-card-values">
                  <div className="mini-card-current-col">
                    <span>{formatCurrency(currentResult.realHourlyRate)} / h</span>
                    <span className="mini-card-city-name">{currentInputs.workHours}h + {currentInputs.commuteTime}h</span>
                  </div>
                  <div className="mini-card-target-col">
                    <span>{formatCurrency(targetResult.realHourlyRate)} / h</span>
                    <span className="mini-card-city-name">{targetInputs.workHours}h + {targetInputs.commuteTime}h</span>
                  </div>
                </div>
                <span className={`mini-card-trend ${targetResult.realHourlyRate >= currentResult.realHourlyRate ? "up" : "down"}`}>
                  {targetResult.realHourlyRate >= currentResult.realHourlyRate ? (
                    <>
                      <ArrowUpRight size={14} />
                      {`+${((targetResult.realHourlyRate / currentResult.realHourlyRate - 1) * 100).toFixed(1)}%`}
                    </>
                  ) : (
                    <>
                      <ArrowDownRight size={14} />
                      {`${((targetResult.realHourlyRate / currentResult.realHourlyRate - 1) * 100).toFixed(1)}%`}
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* 4. Bottom Charts Grid */}
            <div className="charts-grid">
              
              {/* Monthly breakdown comparative bars */}
              <div className="glass-card chart-card">
                <h3>月度资金流对比 (RMB)</h3>
                <div className="chart-wrapper">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "180px", width: "100%", padding: "10px 0" }}>
                    {/* Bar Groups */}
                    {[
                      { label: "税前薪水", curr: currentResult.inputs.salary, targ: targetResult.inputs.salary },
                      { label: "税后到手", curr: currentResult.netMonthly, targ: targetResult.netMonthly },
                      { label: "每月开销", curr: currentResult.monthlyExpenses, targ: targetResult.monthlyExpenses },
                      { label: "住房公积", curr: currentResult.housingFundEmployee * 2, targ: targetResult.housingFundEmployer * 2 },
                      { label: "结余存钱", curr: currentResult.monthlySavings, targ: targetResult.monthlySavings },
                    ].map((item, idx) => {
                      const maxVal = Math.max(currentResult.inputs.salary, targetResult.inputs.salary, 1);
                      const currHeight = `${(item.curr / maxVal) * 150}px`;
                      const targHeight = `${(item.targ / maxVal) * 150}px`;

                      return (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "150px" }}>
                            <div
                              style={{ width: "12px", height: currHeight, background: "var(--color-current)", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }}
                              title={`${currentCity.name}: ${formatCurrency(item.curr)}`}
                            ></div>
                            <div
                              style={{ width: "12px", height: targHeight, background: "var(--color-target)", borderRadius: "3px 3px 0 0", transition: "height 0.3s ease" }}
                              title={`${targetCity.name}: ${formatCurrency(item.targ)}`}
                            ></div>
                          </div>
                          <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px", fontSize: "11px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", background: "var(--color-current)", borderRadius: "2px" }}></span>
                    <span>{currentCity.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "10px", height: "10px", background: "var(--color-target)", borderRadius: "2px" }}></span>
                    <span>{targetCity.name}</span>
                  </div>
                </div>
              </div>

              {/* 5 Years Savings Forecast Line Chart */}
              <div className="glass-card chart-card">
                <h3>五年存款趋势预测 (RMB)</h3>
                <div className="chart-wrapper" style={{ flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                  <div style={{ position: "relative", width: "100%", height: "180px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {/* Draw SVG lines */}
                    <svg viewBox="0 0 500 180" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                      <defs>
                        <linearGradient id="current-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="var(--color-current)" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="var(--color-current)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="target-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="var(--color-target)" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="var(--color-target)" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Gridlines */}
                      {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={180 - ratio * 160}
                          x2="500"
                          y2={180 - ratio * 160}
                          stroke="rgba(255,255,255,0.03)"
                          strokeDasharray="4 4"
                        />
                      ))}
                      
                      {/* Area 1 (Current) */}
                      <path
                        d={`M 0,180 ` + current5YearSavings.map((val, idx) => {
                          const x = (idx / 5) * 500;
                          const y = 180 - (val / maxSavings5Year) * 150;
                          return `L ${x},${y}`;
                        }).join(" ") + ` L 500,180 Z`}
                        fill="url(#current-area-grad)"
                        stroke="none"
                        style={{ transition: "all 0.5s ease" }}
                      />

                      {/* Area 2 (Target) */}
                      <path
                        d={`M 0,180 ` + target5YearSavings.map((val, idx) => {
                          const x = (idx / 5) * 500;
                          const y = 180 - (val / maxSavings5Year) * 150;
                          return `L ${x},${y}`;
                        }).join(" ") + ` L 500,180 Z`}
                        fill="url(#target-area-grad)"
                        stroke="none"
                        style={{ transition: "all 0.5s ease" }}
                      />

                      {/* Line 1 (Current) */}
                      <path
                        d={`M 0,180 ` + current5YearSavings.map((val, idx) => {
                          const x = (idx / 5) * 500;
                          const y = 180 - (val / maxSavings5Year) * 150;
                          return `L ${x},${y}`;
                        }).join(" ")}
                        fill="none"
                        stroke="var(--color-current)"
                        strokeWidth="2.5"
                        style={{ transition: "all 0.5s ease" }}
                      />
                      {current5YearSavings.map((val, idx) => {
                        const x = (idx / 5) * 500;
                        const y = 180 - (val / maxSavings5Year) * 150;
                        return (
                          <circle
                            key={idx}
                            cx={x}
                            cy={y}
                            r="4.5"
                            fill="#08060c"
                            stroke="var(--color-current)"
                            strokeWidth="2"
                          >
                            <title>{idx === 0 ? `当前: ${formatCurrency(val)}` : `第 ${idx} 年: ${formatCurrency(val)}`}</title>
                          </circle>
                        );
                      })}

                      {/* Line 2 (Target) */}
                      <path
                        d={`M 0,180 ` + target5YearSavings.map((val, idx) => {
                          const x = (idx / 5) * 500;
                          const y = 180 - (val / maxSavings5Year) * 150;
                          return `L ${x},${y}`;
                        }).join(" ")}
                        fill="none"
                        stroke="var(--color-target)"
                        strokeWidth="2.5"
                        style={{ transition: "all 0.5s ease" }}
                      />
                      {target5YearSavings.map((val, idx) => {
                        const x = (idx / 5) * 500;
                        const y = 180 - (val / maxSavings5Year) * 150;
                        return (
                          <circle
                            key={idx}
                            cx={x}
                            cy={y}
                            r="4.5"
                            fill="#08060c"
                            stroke="var(--color-target)"
                            strokeWidth="2"
                          >
                            <title>{idx === 0 ? `当前: ${formatCurrency(val)}` : `第 ${idx} 年: ${formatCurrency(val)}`}</title>
                          </circle>
                        );
                      })}
                    </svg>
                    
                    {/* Left Legend for Max Value */}
                    <span style={{ position: "absolute", left: "0", top: "5px", fontSize: "9px", color: "var(--text-muted)" }}>
                      {formatCurrency(maxSavings5Year)}
                    </span>
                  </div>
                  {/* X-axis legends */}
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "6px 0", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>现在</span>
                    <span>第 1 年</span>
                    <span>第 2 年</span>
                    <span>第 3 年</span>
                    <span>第 4 年</span>
                    <span>第 5 年</span>
                  </div>
                </div>
              </div>

              {/* Expense breakdown Donut charts */}
              <div className="glass-card chart-card" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0 }}>消费开支结构</h3>
                  <div className="donut-city-toggle">
                    <button 
                      className={`btn-toggle-small ${activeDonutCity === "current" ? "active" : ""}`}
                      onClick={() => setActiveDonutCity("current")}
                    >
                      当前城市 ({currentCity.name})
                    </button>
                    <button 
                      className={`btn-toggle-small ${activeDonutCity === "target" ? "active" : ""}`}
                      onClick={() => setActiveDonutCity("target")}
                    >
                      目标城市 ({targetCity.name})
                    </button>
                  </div>
                </div>
                {activeDonutCity === "current" 
                  ? renderDonutChart(currentResult, true) 
                  : renderDonutChart(targetResult, false)}
              </div>

            </div>

            {/* Pro Tip Banner */}
            <div className="tip-banner">
              <div className="tip-content">
                <Sparkles size={18} className="tip-icon" />
                <span>
                  <strong>专家跳槽分析建议：</strong>
                  {diffWorth >= 75
                    ? `考虑到目标城市【${targetCity.name}】更高的可支配资金结余 and 优秀的 WLB 评分，此 Offer 对你的长期财务规划非常有利，时薪折算也很划算。`
                    : diffWorth >= 55
                    ? `跳槽到【${targetCity.name}】能给你带来一定的总存款提升，但需注意工作时长或高房租导致的隐藏时薪被稀释。建议在此基础上跟 HR 争取多 10-15% 的年终奖或股票。`
                    : `此 Offer 虽然看起来税前总薪水有所上涨，但高额的城市生活开销与超常的加班时长导致你的【真实到手时薪】和【自由时间】严重缩水。建议拒绝，或要求更高的溢价。`}
                </span>
              </div>
              <button className="btn-secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                返回顶部调整滑块
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Cost of Living comparison detailed dashboard */}
        {activeTab === "city-compare" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="glass-card">
              <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                <MapPin size={24} style={{ color: "var(--color-target)" }} />
                城市开支与消费对比看板
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
                租房价格和物价水平对实际购买力的作用十分显著。以下是【{currentCity.name}】与【{targetCity.name}】的每项日常开支对比，可使用下方滑块进行调整。
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
                {/* Current City Column */}
                <div className="current" style={{ borderRight: "1px solid var(--card-border)", paddingRight: "30px" }}>
                  <h3 style={{ color: "var(--color-current)", marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
                    <span>{currentCity.name} 月开支</span>
                    <span>{formatCurrency(currentResult.monthlyExpenses)}/月</span>
                  </h3>
                  <div className="sliders-group">
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">房租/房贷月支出</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customRent)}</span>
                      </div>
                      <input
                        type="range" min="0" max="20000" step="100" className="custom-range"
                        value={currentInputs.customRent}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customRent: Number(e.target.value) })}
                      />
                    </div>
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每日伙食餐饮开销</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customFood)} / 天 (约 {formatCurrency(currentInputs.customFood * 30.5)}/月)</span>
                      </div>
                      <input
                        type="range" min="0" max="300" step="5" className="custom-range"
                        value={currentInputs.customFood}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customFood: Number(e.target.value) })}
                      />
                    </div>
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每日通勤与交通</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customTransport)} / 天 (约 {formatCurrency(currentInputs.customTransport * 30.5)}/月)</span>
                      </div>
                      <input
                        type="range" min="0" max="200" step="5" className="custom-range"
                        value={currentInputs.customTransport}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customTransport: Number(e.target.value) })}
                      />
                    </div>
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每月水电杂费 (水电物业电话费)</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customUtilities)}</span>
                      </div>
                      <input
                        type="range" min="0" max="3000" step="50" className="custom-range"
                        value={currentInputs.customUtilities}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customUtilities: Number(e.target.value) })}
                      />
                    </div>
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每月社交、娱乐与其它消费</span>
                        <span className="slider-value">{formatCurrency(currentInputs.customLeisure)}</span>
                      </div>
                      <input
                        type="range" min="0" max="10000" step="100" className="custom-range"
                        value={currentInputs.customLeisure}
                        onChange={(e) => setCurrentInputs({ ...currentInputs, customLeisure: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                {/* Target City Column */}
                <div className="target">
                  <h3 style={{ color: "var(--color-target)", marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
                    <span>{targetCity.name} 月开支</span>
                    <span>{formatCurrency(targetResult.monthlyExpenses)}/月</span>
                  </h3>
                  <div className="sliders-group">
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">房租/房贷月支出</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customRent)}</span>
                      </div>
                      <input
                        type="range" min="0" max="20000" step="100" className="custom-range"
                        value={targetInputs.customRent}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customRent: Number(e.target.value) })}
                      />
                    </div>
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每日伙食餐饮开销</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customFood)} / 天 (约 {formatCurrency(targetInputs.customFood * 30.5)}/月)</span>
                      </div>
                      <input
                        type="range" min="0" max="300" step="5" className="custom-range"
                        value={targetInputs.customFood}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customFood: Number(e.target.value) })}
                      />
                    </div>
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每日通勤与交通</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customTransport)} / 天 (约 {formatCurrency(targetInputs.customTransport * 30.5)}/月)</span>
                      </div>
                      <input
                        type="range" min="0" max="200" step="5" className="custom-range"
                        value={targetInputs.customTransport}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customTransport: Number(e.target.value) })}
                      />
                    </div>
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每月水电杂费 (水电物业电话费)</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customUtilities)}</span>
                      </div>
                      <input
                        type="range" min="0" max="3000" step="50" className="custom-range"
                        value={targetInputs.customUtilities}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customUtilities: Number(e.target.value) })}
                      />
                    </div>
                    <div className="slider-container">
                      <div className="slider-label-row">
                        <span className="slider-label">每月社交、娱乐与其它消费</span>
                        <span className="slider-value">{formatCurrency(targetInputs.customLeisure)}</span>
                      </div>
                      <input
                        type="range" min="0" max="10000" step="100" className="custom-range"
                        value={targetInputs.customLeisure}
                        onChange={(e) => setTargetInputs({ ...targetInputs, customLeisure: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-side Donuts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div className="glass-card chart-card">
                <h3>{currentCity.name} 消费开支比例</h3>
                {renderDonutChart(currentResult, true)}
              </div>
              <div className="glass-card chart-card">
                <h3>{targetCity.name} 消费开支比例</h3>
                {renderDonutChart(targetResult, false)}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Salary Analyzer details table */}
        {activeTab === "salary-analyzer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="glass-card" style={{ overflowX: "auto" }}>
              <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                <TrendingUp size={24} style={{ color: "var(--color-target)" }} />
                薪资与五险一金详细对比表
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
                社保及公积金扣除基准在各个城市差别很大。以下是双方 Offer 在到手薪资、个税及公积金配缴金额等方面的财务对比：
              </p>

              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--text-secondary)", height: "40px" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>计算科目</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "var(--color-current)" }}>{currentCity.name} ({currentInputs.jobTitle})</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "var(--color-target)" }}>{targetCity.name} ({targetInputs.jobTitle})</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>跳槽收益变化</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "税前基本月薪", curr: currentInputs.salary, targ: targetInputs.salary, type: "normal" },
                    { name: `个人养老保险 (${(currentInputs.pensionRate * 100).toFixed(1)}% vs ${(targetInputs.pensionRate * 100).toFixed(1)}%)`, curr: -currentResult.pension, targ: -targetResult.pension, type: "deduct" },
                    { name: `个人医疗保险 (${(currentInputs.medicalRate * 100).toFixed(1)}% vs ${(targetInputs.medicalRate * 100).toFixed(1)}%)`, curr: -currentResult.medical, targ: -targetResult.medical, type: "deduct" },
                    { name: `个人失业保险 (${(currentInputs.unemploymentRate * 100).toFixed(2)}% vs ${(targetInputs.unemploymentRate * 100).toFixed(2)}%)`, curr: -currentResult.unemployment, targ: -targetResult.unemployment, type: "deduct" },
                    { name: `个人住房公积金 (${(currentInputs.housingFundRate * 100).toFixed(0)}% vs ${(targetInputs.housingFundRate * 100).toFixed(0)}%)`, curr: -currentResult.housingFundEmployee, targ: -targetResult.housingFundEmployee, type: "deduct" },
                    { name: "月个人所得税", curr: -currentResult.individualTaxMonthly, targ: -targetResult.individualTaxMonthly, type: "deduct" },
                    { name: "税后到手月薪", curr: currentResult.netMonthly, targ: targetResult.netMonthly, type: "highlight-bold" },
                    { name: `月公司配缴公积金 (${(currentInputs.housingFundRate * 100).toFixed(0)}% vs ${(targetInputs.housingFundRate * 100).toFixed(0)}%)`, curr: currentResult.housingFundEmployer, targ: targetResult.housingFundEmployer, type: "add" },
                    { name: "广义月度收益 (到手月薪 + 双方公积金)", curr: currentResult.netMonthly + currentResult.housingFundEmployee * 2, targ: targetResult.netMonthly + targetResult.housingFundEmployee * 2, type: "bold" },
                    { name: "年终奖税前", curr: currentInputs.bonus, targ: targetInputs.bonus, type: "normal" },
                    { name: "年终奖个税 (单独计税)", curr: -calculateBonusTax(currentInputs.bonus), targ: -calculateBonusTax(targetInputs.bonus), type: "deduct" },
                    { name: "年终奖税后到手", curr: currentInputs.bonus - calculateBonusTax(currentInputs.bonus), targ: targetInputs.bonus - calculateBonusTax(targetInputs.bonus), type: "add" },
                    { name: "税后年包总额 (12个月到手 + 税后年终奖)", curr: currentResult.netAnnual, targ: targetResult.netAnnual, type: "bold" },
                    { name: "年度广义总回报 (税后年包 + 全年双方公积金)", curr: currentResult.annualSavings + currentResult.monthlyExpenses * 12, targ: targetResult.annualSavings + targetResult.monthlyExpenses * 12, type: "highlight-bold" },
                  ].map((row, idx) => {
                    const diff = row.targ - row.curr;
                    const diffFormatted = diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff);
                    const rowStyle: React.CSSProperties = {
                      borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                    };
                    if (row.type === "highlight-bold") {
                      rowStyle.fontWeight = "bold";
                      rowStyle.background = "rgba(255,255,255,0.02)";
                    } else if (row.type === "bold") {
                      rowStyle.fontWeight = "600";
                    }

                    return (
                      <tr key={idx} style={rowStyle}>
                        <td style={{ padding: "14px 16px" }}>{row.name}</td>
                        <td style={{ padding: "14px 16px", textAlign: "right", color: row.curr < 0 ? "#ef4444" : "inherit" }}>
                          {formatCurrency(Math.abs(row.curr))}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right", color: row.targ < 0 ? "#ef4444" : "inherit" }}>
                          {formatCurrency(Math.abs(row.targ))}
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right", color: diff > 0 ? "var(--color-success)" : diff < 0 ? "#ef4444" : "inherit", fontWeight: "600" }}>
                          {diff === 0 ? "无变化" : diffFormatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Savings Forecast full view */}
        {activeTab === "savings-forecast" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="glass-card">
              <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                <PiggyBank size={24} style={{ color: "var(--color-target)" }} />
                五年累积财富趋势预测
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
                下表以【到手净月薪 + 公积金账户存量 - 日常生活开销】计算你的净结余，并假定你在五年内维持同样的开销与薪水。
              </p>

              {/* Large Line Chart */}
              <div style={{ width: "100%", height: "240px", position: "relative", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
                <svg viewBox="0 0 600 240" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  <defs>
                    <linearGradient id="current-large-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--color-current)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--color-current)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="target-large-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--color-target)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--color-target)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Gridlines */}
                  {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={240 - ratio * 200}
                      x2="600"
                      y2={240 - ratio * 200}
                      stroke="rgba(255,255,255,0.03)"
                      strokeDasharray="4 4"
                    />
                  ))}
                  
                  {/* Area 1 (Current) */}
                  <path
                    d={`M 0,240 ` + current5YearSavings.map((val, idx) => {
                      const x = (idx / 5) * 600;
                      const y = 240 - (val / maxSavings5Year) * 200;
                      return `L ${x},${y}`;
                    }).join(" ") + ` L 600,240 Z`}
                    fill="url(#current-large-grad)"
                    stroke="none"
                    style={{ transition: "all 0.5s ease" }}
                  />

                  {/* Area 2 (Target) */}
                  <path
                    d={`M 0,240 ` + target5YearSavings.map((val, idx) => {
                      const x = (idx / 5) * 600;
                      const y = 240 - (val / maxSavings5Year) * 200;
                      return `L ${x},${y}`;
                    }).join(" ") + ` L 600,240 Z`}
                    fill="url(#target-large-grad)"
                    stroke="none"
                    style={{ transition: "all 0.5s ease" }}
                  />

                  {/* Current Job Line */}
                  <path
                    d={`M 0,240 ` + current5YearSavings.map((val, idx) => {
                      const x = (idx / 5) * 600;
                      const y = 240 - (val / maxSavings5Year) * 200;
                      return `L ${x},${y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="var(--color-current)"
                    strokeWidth="3"
                    style={{ transition: "all 0.5s ease" }}
                  />
                  {current5YearSavings.map((val, idx) => {
                    const x = (idx / 5) * 600;
                    const y = 240 - (val / maxSavings5Year) * 200;
                    return (
                      <circle key={idx} cx={x} cy={y} r="5" fill="#08060c" stroke="var(--color-current)" strokeWidth="3">
                        <title>{idx === 0 ? `当前: ${formatCurrency(val)}` : `第 ${idx} 年: ${formatCurrency(val)}`}</title>
                      </circle>
                    );
                  })}

                  {/* Target Job Line */}
                  <path
                    d={`M 0,240 ` + target5YearSavings.map((val, idx) => {
                      const x = (idx / 5) * 600;
                      const y = 240 - (val / maxSavings5Year) * 200;
                      return `L ${x},${y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="var(--color-target)"
                    strokeWidth="3"
                    style={{ transition: "all 0.5s ease" }}
                  />
                  {target5YearSavings.map((val, idx) => {
                    const x = (idx / 5) * 600;
                    const y = 240 - (val / maxSavings5Year) * 200;
                    return (
                      <circle key={idx} cx={x} cy={y} r="5" fill="#08060c" stroke="var(--color-target)" strokeWidth="3">
                        <title>{idx === 0 ? `当前: ${formatCurrency(val)}` : `第 ${idx} 年: ${formatCurrency(val)}`}</title>
                      </circle>
                    );
                  })}
                </svg>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "30px", padding: "0 10px" }}>
                <span>现在</span>
                <span>第一年末</span>
                <span>第二年末</span>
                <span>第三年末</span>
                <span>第四年末</span>
                <span>第五年末</span>
              </div>

              {/* Data Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>预测时间</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "var(--color-current)" }}>{currentCity.name} 累计存钱</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "var(--color-target)" }}>{targetCity.name} 累计存钱</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>存量财富净差额</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((year) => {
                    const curr = currentResult.annualSavings * year;
                    const targ = targetResult.annualSavings * year;
                    const diff = targ - curr;
                    const diffFormatted = diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff);

                    return (
                      <tr key={year} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                        <td style={{ padding: "14px 16px" }}>第 {year} 年底</td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>{formatCurrency(curr)}</td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>{formatCurrency(targ)}</td>
                        <td style={{ padding: "14px 16px", textAlign: "right", color: diff > 0 ? "var(--color-success)" : diff < 0 ? "#ef4444" : "inherit", fontWeight: "600" }}>
                          {diff === 0 ? "无变化" : diffFormatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Glowing card */}
            <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(16, 185, 129, 0.3)", background: "rgba(16, 185, 129, 0.02)" }}>
              <div>
                <h3 style={{ fontSize: "16px", marginBottom: "6px" }}>五年累积储蓄差距</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                  如果这五年中跳槽到【{targetCity.name}】，你将比留在【{currentCity.name}】多存储：
                </p>
              </div>
              <span style={{ fontSize: "28px", fontWeight: "800", color: "var(--color-success)" }}>
                {formatCurrency((targetResult.annualSavings - currentResult.annualSavings) * 5)}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* 5. Supabase Sync Modal */}
      {isSyncModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSyncModalOpen(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>多端同步设置 (Supabase Cloud Sync)</h2>
              <button className="modal-close" onClick={() => setIsSyncModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSupabaseConfig}>
              <div className="modal-body">
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                  如果你想在手机和电脑之间实时无缝同步配置，可以创建一个免费的 Supabase 项目，输入对应的 URL 和 API Key。<br/>
                  <span style={{ color: "var(--color-primary)", opacity: 0.8 }}>提示：在 Supabase 新版界面中，Project URL 位于 API 设置中。Anon Public Key 可以直接使用 API 页面中的 <strong>Publishable key</strong> (以 sb_publishable_ 开头)。</span>
                </p>

                <div className="form-group">
                  <label>Supabase 项目 URL (注意：请删去结尾的 /rest/v1/)</label>
                  <input
                    type="url"
                    placeholder="https://your-project-id.supabase.co"
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Anon Public Key (或 Publishable key)</label>
                  <input
                    type="text"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={sbKey}
                    onChange={(e) => setSbKey(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>用户同步标识 (User ID)</label>
                  <input
                    type="text"
                    placeholder="例如：my_jobhop_session"
                    value={sbUserId}
                    onChange={(e) => setSbUserId(e.target.value)}
                  />
                </div>

                <div style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px", fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                  <strong>数据库表结构创建提示：</strong>
                  <br />
                  你需要在 Supabase 的 SQL Editor 运行以下命令创建同步表，才能写入数据：
                  <pre style={{ background: "rgba(0,0,0,0.3)", padding: "6px", borderRadius: "4px", marginTop: "4px", fontSize: "10px", color: "var(--text-secondary)" }}>
                    {`create table jobhop_sync (
  id text primary key,
  current_data jsonb,
  target_data jsonb,
  updated_at timestamptz
);`}
                  </pre>
                </div>

                {supabaseConfig && (
                  <div className="qr-sync-container" style={{ marginTop: "16px" }}>
                    <div className="qr-sync-image-wrapper">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=ffffff&bgcolor=130f24&data=${encodeURIComponent(
                          `${window.location.origin}${window.location.pathname}?sb_url=${encodeURIComponent(supabaseConfig.url)}&sb_key=${encodeURIComponent(supabaseConfig.anonKey)}&sb_uid=${encodeURIComponent(supabaseConfig.userId || "anonymous_user")}`
                        )}`}
                        alt="Sync QR Code"
                      />
                    </div>
                    <div className="qr-sync-info">
                      <h3 style={{ fontSize: "13px" }}>手机极速扫码配对</h3>
                      <p style={{ fontSize: "11px", margin: 0 }}>使用手机扫描左侧二维码，即可瞬间将当前的云端同步凭证与数据载入手机端，实现双端互联！</p>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          padding: "4px 8px",
                          fontSize: "10px",
                          width: "fit-content",
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        onClick={() => {
                          const shareSyncUrl = `${window.location.origin}${window.location.pathname}?sb_url=${encodeURIComponent(supabaseConfig.url)}&sb_key=${encodeURIComponent(supabaseConfig.anonKey)}&sb_uid=${encodeURIComponent(supabaseConfig.userId || "anonymous_user")}`;
                          navigator.clipboard.writeText(shareSyncUrl);
                          showToast("同步配对链接已复制！您可以发送给手机进行导入。", "success");
                        }}
                      >
                        <Copy size={10} />
                        复制同步链接
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {supabaseConfig && (
                  <button type="button" className="btn-secondary" style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)" }} onClick={handleClearSupabaseConfig}>
                    清除云同步
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={() => setIsSyncModalOpen(false)}>
                  取消
                </button>
                <button type="submit" className="btn-secondary" style={{ background: "linear-gradient(90deg, var(--color-current), var(--color-target))", border: "none" }}>
                  保存并同步
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Profile & Data Center Modal */}
      {isProfileModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="glass-card modal-content" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <User size={20} style={{ color: "var(--color-current)" }} />
                <h2>个人中心与数据管理</h2>
              </div>
              <button className="modal-close" onClick={() => setIsProfileModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="profile-modal-grid">
                {/* Left side: Profile Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-group">
                    <label>用户昵称</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="职场探索者"
                      value={userName}
                      onChange={(e) => {
                        const val = e.target.value || "职场探索者";
                        setUserName(val);
                        localStorage.setItem("jobhop_username", val);
                      }}
                    />
                  </div>

                  <div className="avatar-selection-container">
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>选择霓虹头像</label>
                    <div className="avatar-selection-grid">
                      {["avatar1", "avatar2", "avatar3", "avatar4", "avatar5", "avatar6"].map((avKey) => (
                        <div
                          key={avKey}
                          className={`avatar-selection-item ${userAvatar === avKey ? "selected" : ""}`}
                          style={{ background: getAvatarGradient(avKey) }}
                          onClick={() => {
                            setUserAvatar(avKey);
                            localStorage.setItem("jobhop_avatar", avKey);
                          }}
                        >
                          {getAvatarIcon(avKey, 16)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side: Data management */}
                <div className="backup-actions-container">
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>本地数据管理</label>
                  
                  <div className="backup-btn-group">
                    <button className="btn-secondary" onClick={handleExportAll} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px" }}>
                      <Download size={14} />
                      备份导出
                    </button>
                    
                    <label
                      htmlFor="import-all-file"
                      className="btn-secondary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                        margin: 0,
                        padding: "10px 14px",
                        textAlign: "center"
                      }}
                    >
                      <Upload size={14} />
                      恢复导入
                    </label>
                    <input
                      id="import-all-file"
                      type="file"
                      accept=".json"
                      onChange={handleImportAll}
                      style={{ display: "none" }}
                    />
                  </div>

                  <button
                    className="btn-secondary"
                    onClick={handleClearAll}
                    style={{
                      color: "#ef4444",
                      borderColor: "rgba(239, 68, 68, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "12px",
                      width: "100%"
                    }}
                  >
                    <Database size={14} />
                    清除本地全部数据
                  </button>

                  <div className={`sync-status-badge ${supabaseConfig ? "active" : ""}`} style={{ marginTop: "4px" }}>
                    <span style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: supabaseConfig ? "var(--color-success)" : "var(--text-muted)",
                      boxShadow: supabaseConfig ? "0 0 8px var(--color-success)" : "none"
                    }}></span>
                    云同步：{supabaseConfig ? "已联通 (在线)" : "未激活 (本地)"}
                  </div>
                </div>
              </div>

              {/* Bottom: Supabase QR Code Mobile Sync */}
              {supabaseConfig ? (
                <div className="qr-sync-container">
                  <div className="qr-sync-image-wrapper">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=ffffff&bgcolor=130f24&data=${encodeURIComponent(
                        `${window.location.origin}${window.location.pathname}?sb_url=${encodeURIComponent(supabaseConfig.url)}&sb_key=${encodeURIComponent(supabaseConfig.anonKey)}&sb_uid=${encodeURIComponent(supabaseConfig.userId || "anonymous_user")}`
                      )}`}
                      alt="Sync QR Code"
                    />
                  </div>
                  <div className="qr-sync-info">
                    <h3>手机极速扫码同步</h3>
                    <p>通过手机扫码，可以瞬间将云端同步凭证与数据载入手机端使用：</p>
                    <ol>
                      <li>使用手机相机、微信或浏览器扫描左侧二维码。</li>
                      <li>手机端将自动导入该 Supabase 云同步通道及相关数据。</li>
                      <li>完成首次拉取后即可实现双端数据自动联通！</li>
                    </ol>
                    <button
                      className="btn-secondary"
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        width: "fit-content",
                        marginTop: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      onClick={() => {
                        const shareSyncUrl = `${window.location.origin}${window.location.pathname}?sb_url=${encodeURIComponent(supabaseConfig.url)}&sb_key=${encodeURIComponent(supabaseConfig.anonKey)}&sb_uid=${encodeURIComponent(supabaseConfig.userId || "anonymous_user")}`;
                        navigator.clipboard.writeText(shareSyncUrl);
                        showToast("同步配对链接已复制！您可以发送给手机进行导入。", "success");
                      }}
                    >
                      <Copy size={12} />
                      复制同步链接
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "16px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "16px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    lineHeight: "1.6"
                  }}
                >
                  <QrCode size={24} style={{ color: "var(--text-muted)", marginBottom: "8px" }} />
                  <p>
                    未检测到云端同步配置。如果希望生成双端扫码同步的二维码，请先在左侧菜单点击 <strong>云端同步 (Cloud Sync)</strong> 并配置保存您的 Supabase 项目。
                  </p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsProfileModalOpen(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
