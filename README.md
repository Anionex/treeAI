# TreeChat - 树状结构对话应用

## 项目描述
TreeChat是一个基于树状结构的对话应用，支持文件上传、多模型管理和会话管理。采用React + TypeScript构建，提供直观的聊天界面和系统交互功能。

# Usage
1. 确保已安装Node.js 18+
2. 克隆项目仓库
3. 安装依赖

```
npm install
npm run dev
```

![image](https://github.com/user-attachments/assets/b9c4d615-6a36-443e-8fbc-35312a70df87)



## 技术栈
- 前端框架: React 18
- 语言: TypeScript
- 构建工具: Vite
- CSS框架: Tailwind CSS + PostCSS
- 状态管理: 自定义Store方案
- 代码规范: ESLint

## 功能特性
- 树状结构对话流 (ChatFlow)
- 文件上传处理 (FileUploadButton)
- 多AI模型管理 (ModelManager)
- 侧边栏导航 (Sidebar)
- 会话状态管理 (sessionStore)
- 数据库上下文 (DatabaseContext)
- 实用工具集 (fileUtils, exportUtils)


## 项目结构
```
src/
├── App.tsx            # 主应用组件
├── main.tsx           # 应用入口
├── index.css          # 全局样式
├── types.ts           # 类型定义
├── components/        # UI组件
│   ├── ChatFlow.tsx   # 对话流组件
│   ├── FileUploadButton.tsx # 文件上传
│   ├── ModelManager.tsx    # 模型管理
│   ├── Sidebar.tsx    # 侧边栏
│   └── nodes/         # 对话节点组件
├── context/           # 上下文
│   └── DatabaseContext.tsx
├── db/                # 数据库相关
│   └── db.ts
├── services/          # 服务层
│   └── apiService.ts
├── stores/            # 状态存储
│   ├── modelStore.ts
│   └── sessionStore.ts
└── utils/             # 工具函数
    ├── exportUtils.ts
    └── fileUtils.ts
```


## 贡献
欢迎提交Pull Request，请确保代码通过所有检查。
