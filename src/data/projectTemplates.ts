export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  recommendedColor: string;
  iconName: 'scrum' | 'bug' | 'campaign' | 'product' | 'custom';
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
  },
  {
    id: 'bug_tracking',
    name: '研发 Bug 缺陷与质量追踪',
    category: '质量保证',
    badge: 'QA & 缺陷防护',
    description: '专注于软件缺陷分类分级、致命漏洞响应、复测关单与 Release 质量门禁守卫。',
    recommendedColor: 'rose',
    iconName: 'bug',
  },
  {
    id: 'campaign',
    name: '运营活动全流程发布看板',
    category: '市场运营',
    badge: '运营 & 营销',
    description: '适用于市场活动策划、视觉 KV 设计、H5 互动开发与多渠道发稿排期。',
    recommendedColor: 'amber',
    iconName: 'campaign',
  },
  {
    id: 'product_release',
    name: '软件产品全生命周期迭代',
    category: '产品管理',
    badge: '产品 0 - 1',
    description: '从 MVP 概念验证、PRD 交互原型到商业化 1.0 上线与客户成功交付的标准全流程。',
    recommendedColor: 'indigo',
    iconName: 'product',
  },
  {
    id: 'custom',
    name: '自由定义空白项目',
    category: '通用项目',
    badge: '灵活自定义',
    description: '不预置任何预设任务与里程碑，创建干净的基础项目空间，由您随时自定义规划。',
    recommendedColor: 'slate',
    iconName: 'custom',
  },
];
