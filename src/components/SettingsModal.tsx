import React, { useState } from 'react';
import { AiSettings, AiProvider } from '../types';
import { X, Settings, KeyRound, Cpu, Link2, Check, Eye, EyeOff, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  settings: AiSettings | null;
  onClose: () => void;
  onSave: (data: { provider: AiProvider; apiKey: string; model: string; baseUrl: string }) => void;
}

// 各供应商预设
const PROVIDER_PRESETS: Record<
  AiProvider,
  { label: string; defaultModel: string; defaultBaseUrl: string; modelHint: string; baseUrlHint: string }
> = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-3.6-flash',
    defaultBaseUrl: '',
    modelHint: '如 gemini-3.6-flash、gemini-2.5-pro',
    baseUrlHint: 'Gemini 无需配置 Base URL',
  },
  deepseek: {
    label: 'DeepSeek',
    defaultModel: 'deepseek-v4-flash',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    modelHint: '如 deepseek-v4-flash(经济)、deepseek-v4-pro(高性能)',
    baseUrlHint: '默认 https://api.deepseek.com/v1',
  },
  openai: {
    label: 'OpenAI 兼容',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    modelHint: '如 gpt-4o-mini、gpt-4o、或兼容端点模型名',
    baseUrlHint: '默认 https://api.openai.com/v1,可改为代理/兼容服务',
  },
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onSave }) => {
  const [provider, setProvider] = useState<AiProvider>(settings?.provider || 'gemini');
  const [apiKey, setApiKey] = useState(settings?.apiKey || '');
  const [model, setModel] = useState(settings?.model || PROVIDER_PRESETS[settings?.provider || 'gemini'].defaultModel);
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl || '');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [switched, setSwitched] = useState(false);

  const preset = PROVIDER_PRESETS[provider];

  const handleSwitchProvider = (p: AiProvider) => {
    setProvider(p);
    setSwitched(true);
    // 切换供应商:不同供应商 Key 不同,清空让用户重新填写
    setApiKey('');
    const nextPreset = PROVIDER_PRESETS[p];
    // 若当前 model 为空或属于某供应商默认值,则填充新供应商默认 model
    const isDefaultModel =
      !model || Object.values(PROVIDER_PRESETS).some((pr) => pr.defaultModel === model);
    if (isDefaultModel) setModel(nextPreset.defaultModel);

    // Base URL:gemini 置空;否则为空或默认值时填充新默认
    if (p === 'gemini') {
      setBaseUrl('');
    } else {
      const isDefaultBaseUrl =
        !baseUrl || Object.values(PROVIDER_PRESETS).some((pr) => pr.defaultBaseUrl === baseUrl);
      if (isDefaultBaseUrl) setBaseUrl(nextPreset.defaultBaseUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ provider, apiKey, model: model.trim(), baseUrl: baseUrl.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-4 animate-fadeIn text-slate-800">

        {/* Header */}
        <div className="px-7 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-md">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">系统设置</h2>
              <p className="text-[11px] text-slate-500">配置底层大模型与 API 凭证,影响 AI 拆解 / 总结 / Copilot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* 供应商选择 */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              模型供应商
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PROVIDER_PRESETS) as AiProvider[]).map((p) => {
                const isSelected = provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSwitchProvider(p)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs ring-1 ring-emerald-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {PROVIDER_PRESETS[p].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  switched
                    ? `请填写 ${preset.label} 的 API Key`
                    : settings?.hasApiKey
                      ? '已配置(••••),输入新 Key 覆盖'
                      : '粘贴你的 API Key'
                }
                className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                title={showKey ? '隐藏' : '显示'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {provider === 'gemini' && '在 Google AI Studio 获取 API Key。'}
              {provider === 'deepseek' && '在 DeepSeek 开放平台获取 API Key。'}
              {provider === 'openai' && '在 OpenAI 或兼容服务后台获取 Key。'}
              {' Key 仅存于服务端内存,不落盘。'}
            </p>
          </div>

          {/* 模型名称 */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
              模型名称
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={preset.defaultModel}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">{preset.modelHint}</p>
          </div>

          {/* Base URL(非 gemini 显示) */}
          {provider !== 'gemini' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                <Link2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={preset.defaultBaseUrl}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">{preset.baseUrlHint}</p>
            </div>
          )}

          {/* 状态提示 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              当前配置将作用于:<strong>AI 一键拆解子任务</strong>、<strong>Sprint 智能总结</strong>、<strong>团队沟通 @copilot</strong>。
              未配置 Key 时上述功能将回退为内置 Mock 演示数据。
            </p>
          </div>

          {/* 提交 */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              关闭
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {saved ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              {saved ? '已保存' : '保存设置'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
