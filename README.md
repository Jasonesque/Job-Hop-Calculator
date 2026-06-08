[English](./README_en.md) | 简体中文

# 💼 职场跳槽计算器 (Job-Hop Calculator)

这是一个专为职场人打造的**跳槽性价比分析与城市生活成本对比工具**。
它可以帮助你精准计算税后真实收入、对比两座城市的生活成本，并通过直观的图表来评估跳槽是否真的“划算”。

## ✨ 核心功能

- 💰 **精准五险一金与个税计算**：基于最新的社保比例与个税基数，一键计算你的“税前薪资”和“真实税后到手收入”（支持自定义社保缴纳比例与年终奖单独计税）。
- 🏙️ **城市生活成本对比分析**：内置北上广深、杭州、成都、武汉等热门一线/新一线城市数据。从房租、餐饮到水电通勤，全方位对比跳槽前后的“隐性成本”。
- 📊 **可视化性价比分析**：通过多维度的雷达图与折线图，直观展示两份工作的薪资结构、生活结余率及未来存款趋势预测。
- ☁️ **Supabase 多端云同步**：支持手机端与电脑端的数据无缝互联。电脑端配置好后，手机只需极速扫码即可载入数据，且支持一键导出/导入配置备份。
- 🎨 **极简赛博朋克风设计**：拟玻璃态（Glassmorphism）与霓虹渐变 UI，支持自适应手机端与电脑端浏览。

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript + Vite
- **UI & 样式**: Vanilla CSS (CSS Variables, Flexbox/Grid)
- **图标**: Lucide-React
- **图表**: Recharts
- **云端同步**: Supabase (PostgreSQL)
- **部署**: GitHub Pages (自动构建)

## 🚀 快速本地启动

1. **克隆项目到本地**：
   ```bash
   git clone https://github.com/Jasonesque/Job-Hop-Calculator.git
   cd job-hop-calculator
   ```

2. **安装依赖项**：
   ```bash
   npm install
   ```

3. **启动本地开发服务器**：
   ```bash
   npm run dev
   ```

4. **构建生产版本** (如果需要自行部署)：
   ```bash
   npm run build
   ```

## ☁️ 云同步功能配置指南（可选）

本项目原生支持将您的计算配置同步到个人的 Supabase 私人数据库，实现手机扫码多端联通：

1. 注册并创建一个免费的 [Supabase](https://supabase.com/) 项目。
2. 在左侧菜单的最底部找到 **⚙️ Settings (设置)** -> **API**。
3. 复制页面中的 **Project URL**（注意：仅需根域名，不包含 `/rest/v1/` 等后缀）。
4. 复制页面中名为 **Publishable key** 的密钥（通常以 `sb_publishable_` 开头）。
5. **最关键的一步 (建表)**：前往 Supabase 的 **SQL Editor** 菜单，新建一个查询，并执行以下两句代码来创建同步表并打通权限：
   ```sql
   CREATE TABLE IF NOT EXISTS jobhop_sync (
     id text primary key,
     current_data jsonb,
     target_data jsonb,
     updated_at timestamptz
   );
   
   ALTER TABLE jobhop_sync DISABLE ROW LEVEL SECURITY;
   GRANT ALL ON TABLE jobhop_sync TO anon;
   ```
6. 回到本项目的页面，点击左下角的个人模块，填入您的 URL 和 Key 并保存，即可享受畅快的云端同步！

## 📄 许可协议

本项目采用 MIT 协议开源，欢迎自由使用、修改和二次分发。
