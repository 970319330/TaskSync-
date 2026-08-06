import { TaskPriority } from '../types';

export interface MilestonePreset {
  title: string;
  description: string;
  dayOffset: number; // 从项目开始日起推算的算算天数
  color: string;
  defaultTasks: {
    title: string;
    description: string;
    priority: TaskPriority;
    estimatedHours: number;
    tags: string[];
  }[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  recommendedColor: string;
  iconName: 'scrum' | 'bug' | 'campaign' | 'product' | 'custom';
  defaultMilestones: MilestonePreset[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'scrum',
    name: 'Scrum 敏捷双周迭代',
    category: '软件研发',
    badge: '推荐 敏捷Scrum',
    description: '标准 2-4 周 Sprint 敏捷交付流程，包含需求冻结、Alpha 核心研发、Beta 准入回归与 MVP 正式上线。',
    recommendedColor: 'emerald',
    iconName: 'scrum',
    defaultMilestones: [
      {
        title: 'M1: 需求评审与架构设计',
        description: '梳理用户故事，评审 API 规范与数据库 Schema 结构',
        dayOffset: 7,
        color: 'emerald',
        defaultTasks: [
          {
            title: '[需求] 核心 Product Backlog 需求卡片拆解与估时',
            description: '召集团队进行敏捷估算 Poker，确定 Sprint 1 承诺的 User Story 列表。',
            priority: 'high',
            estimatedHours: 8,
            tags: ['需求评审', 'Sprint1'],
          },
          {
            title: '[架构] 数据库表结构 Schema 升级与 API 规范校验',
            description: '定义数据持久层模型，产出 Swagger/OpenAPI 接口文档并完成团队基线对齐。',
            priority: 'urgent',
            estimatedHours: 12,
            tags: ['技术架构', 'API规范'],
          },
        ],
      },
      {
        title: 'M2: Alpha 核心功能冻结',
        description: '完成核心业务主流程编码与前后端 API 联调',
        dayOffset: 14,
        color: 'blue',
        defaultTasks: [
          {
            title: '[研发] 核心业务主流程代码编码与单元测试编写',
            description: '按组件和模块拆分实现业务核心功能，保障单测覆盖率 > 80%。',
            priority: 'high',
            estimatedHours: 24,
            tags: ['核心研发', 'Alpha'],
          },
          {
            title: '[联调] 前后端接口联调与异常状态捕获测试',
            description: '对接真实 REST/GraphQL 接口，打通前端视图与后端数据持久化。',
            priority: 'medium',
            estimatedHours: 16,
            tags: ['接口联调', '前后端'],
          },
        ],
      },
      {
        title: 'M3: Beta 准入验收与回归测试',
        description: '全量 Bug 清理、集成测试与性能指标达标验证',
        dayOffset: 21,
        color: 'indigo',
        defaultTasks: [
          {
            title: '[测试] 集成回归测试与防呆门禁校验',
            description: '测试团队执行自动化与手动回归用例，确保无致命阻断缺陷。',
            priority: 'urgent',
            estimatedHours: 16,
            tags: ['集成测试', 'QA门禁'],
          },
          {
            title: '[性能] 关键路径压测与数据库慢查询 SQL 优化',
            description: '针对并发场景进行压力测试，补充索引并优化 API 响应时延 < 100ms。',
            priority: 'medium',
            estimatedHours: 12,
            tags: ['性能优化', 'SQL'],
          },
        ],
      },
      {
        title: 'M4: MVP 正式发布与上线',
        description: '生产环境灰度部署、Release 割接与发布宣讲',
        dayOffset: 28,
        color: 'purple',
        defaultTasks: [
          {
            title: '[运维] 生产环境灰度构建部署与健康度巡检',
            description: '自动化 Pipeline 执行镜像构建并推送到生产 Pods，监控错误日志与 CPU/内存指标。',
            priority: 'high',
            estimatedHours: 8,
            tags: ['生产发布', 'DevOps'],
          },
        ],
      },
    ],
  },
  {
    id: 'bug_tracking',
    name: '研发 Bug 缺陷与质量追踪',
    category: '质量保证',
    badge: 'QA & 缺陷防护',
    description: '专注于软件缺陷分类分级、致命漏洞响应、复测关单与 Release 质量门禁守卫。',
    recommendedColor: 'rose',
    iconName: 'bug',
    defaultMilestones: [
      {
        title: 'M1: P0/P1 致命与严重缺陷清零',
        description: '优先排查并修复导致系统崩溃、数据丢失或越权安全的致命 Bug',
        dayOffset: 5,
        color: 'rose',
        defaultTasks: [
          {
            title: '[P0 缺陷] 生产环境内存泄漏与线程死锁排查',
            description: '定位服务无响应 root cause，修复异常边界并安排 Hotfix 上线。',
            priority: 'urgent',
            estimatedHours: 12,
            tags: ['P0缺陷', 'Hotfix'],
          },
          {
            title: '[P1 缺陷] 用户鉴权 Session 偶发失效问题修复',
            description: '分析 Redis Token 续期机制，修复多节点拓扑下的 Token 同步问题。',
            priority: 'high',
            estimatedHours: 10,
            tags: ['安全鉴权', 'P1缺陷'],
          },
        ],
      },
      {
        title: 'M2: 兼容性与性能体验优化',
        description: '主流浏览器适配、移动端响应式与前端卡顿修复',
        dayOffset: 12,
        color: 'amber',
        defaultTasks: [
          {
            title: '[UI缺陷] 移动端低分辨率屏样式重叠与滚动阻尼修复',
            description: '修复 Safari 与 Chrome 移动版下 fixed 弹窗穿透与字体挤压。',
            priority: 'medium',
            estimatedHours: 8,
            tags: ['UI兼容性', '移动端'],
          },
        ],
      },
      {
        title: 'M3: 质量归因总结与封版',
        description: '复盘缺陷根因，完善回归测试用例库',
        dayOffset: 18,
        color: 'teal',
        defaultTasks: [
          {
            title: '[复盘] 研发缺陷归因分析与单元测试补充',
            description: '统计模块缺陷密度，为高发问题模块编写补漏单元测试用例。',
            priority: 'low',
            estimatedHours: 6,
            tags: ['质量复盘', '单测补漏'],
          },
        ],
      },
    ],
  },
  {
    id: 'campaign',
    name: '运营活动全流程发布看板',
    category: '市场运营',
    badge: '运营 & 营销',
    description: '适用于市场活动策划、视觉 KV 设计、H5 互动开发与多渠道发稿排期。',
    recommendedColor: 'amber',
    iconName: 'campaign',
    defaultMilestones: [
      {
        title: 'M1: 活动策划与视觉 KV 定稿',
        description: '确定活动玩法规则、立项预算与视觉 KV 设计',
        dayOffset: 5,
        color: 'amber',
        defaultTasks: [
          {
            title: '[策划] 营销活动方案、奖品规则与预算审批',
            description: '撰写活动策划案，明确裂变分享机制与奖励发放阈值。',
            priority: 'high',
            estimatedHours: 10,
            tags: ['活动策划', '预算'],
          },
          {
            title: '[设计] 核心视觉 KV、主海报与 H5 页面套件设计',
            description: '设计高吸引力视觉素材，导出 2x/3x 切图供前端调用。',
            priority: 'high',
            estimatedHours: 16,
            tags: ['视觉设计', 'KV'],
          },
        ],
      },
      {
        title: 'M2: 活动 H5 互动研发与风控对接',
        description: '开发互动抽奖 H5 页面，对接防刷风控与券包发货接口',
        dayOffset: 12,
        color: 'emerald',
        defaultTasks: [
          {
            title: '[前端] H5 抽奖翻牌互动与动画效果开发',
            description: '实现流畅动画特效，支持微信 SDK 分享与唤醒功能。',
            priority: 'urgent',
            estimatedHours: 18,
            tags: ['H5研发', '互动动画'],
          },
          {
            title: '[风控] 活动黑灰产防刷逻辑与验证码卡点',
            description: '接入设备指纹与频率限制，保障优惠券不被恶意脚本冒领。',
            priority: 'high',
            estimatedHours: 12,
            tags: ['风控防刷', '后端'],
          },
        ],
      },
      {
        title: 'M3: 全渠道发稿与效果复盘',
        description: '社交媒体发布、推送触发与 ROI 转化分析',
        dayOffset: 20,
        color: 'purple',
        defaultTasks: [
          {
            title: '[数据] 活动 UV/PV 转化漏斗与 ROI 复盘报表',
            description: '分析各推广渠道带来的人均成本与留存率，产出复盘总结。',
            priority: 'medium',
            estimatedHours: 8,
            tags: ['效果复盘', '数据分析'],
          },
        ],
      },
    ],
  },
  {
    id: 'product_release',
    name: '软件产品全生命周期迭代',
    category: '产品管理',
    badge: '产品 0 - 1',
    description: '从 MVP 概念验证、PRD 交互原型到商业化 1.0 上线与客户成功交付的标准全流程。',
    recommendedColor: 'indigo',
    iconName: 'product',
    defaultMilestones: [
      {
        title: 'M1: 概念验证与 PRD 原型评审',
        description: '完成用户痛点调研、竞品分析与可交互原型定稿',
        dayOffset: 10,
        color: 'indigo',
        defaultTasks: [
          {
            title: '[产品] 核心场景 PRD 编写与 Figma 交互原型绘制',
            description: '完成 100% 覆盖主要业务路径的可打通原型，组织跨部门评审。',
            priority: 'urgent',
            estimatedHours: 20,
            tags: ['PRD原型', '产品规划'],
          },
        ],
      },
      {
        title: 'M2: 1.0 内部 Alpha 封闭开发',
        description: '封闭 Sprint 研发，打通首个端到端 MVP 闭环',
        dayOffset: 25,
        color: 'blue',
        defaultTasks: [
          {
            title: '[研发] MVP 最小可交付版本封闭开发',
            description: '聚焦 Top 3 核心痛点功能，剔除不必要修饰，保证极简高可用。',
            priority: 'high',
            estimatedHours: 40,
            tags: ['MVP研发', 'Alpha'],
          },
        ],
      },
      {
        title: 'M3: 商业化正式发布与种子客户交付',
        description: '公测灰度发布、帮助文档上线与种子客户试用',
        dayOffset: 40,
        color: 'emerald',
        defaultTasks: [
          {
            title: '[交付] 种子客户培训指导与产品帮助中心建设',
            description: '编写常见问题 FAQ 知识库，指导首批 10 家种子客户导入使用。',
            priority: 'medium',
            estimatedHours: 16,
            tags: ['客户成功', '帮助中心'],
          },
        ],
      },
    ],
  },
  {
    id: 'custom',
    name: '自由定义空白项目',
    category: '通用项目',
    badge: '灵活自定义',
    description: '不预置任何预设任务与里程碑，创建干净的基础项目空间，由您随时自定义规划。',
    recommendedColor: 'slate',
    iconName: 'custom',
    defaultMilestones: [],
  },
];
