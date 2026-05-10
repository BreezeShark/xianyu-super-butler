import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { createAIProvider, deleteAIProvider, getAIProviders, testAIProvider, updateAIProvider } from '../services/api';
import { AIProviderConfig } from '../types';

const emptyProvider: AIProviderConfig = {
  name: 'NVIDIA Minimax',
  provider_type: 'openai',
  model_name: 'minimaxai/minimax-m2.7',
  api_key: '',
  base_url: 'https://integrate.api.nvidia.com/v1',
  priority: 100,
  enabled: true,
  timeout_seconds: 30,
  max_tokens: 512,
  temperature: 0.7,
};

const providerTypeLabels: Record<string, string> = {
  openai: 'OpenAI兼容',
  dashscope: 'DashScope应用',
  gemini: 'Gemini',
};

const AIConfig: React.FC = () => {
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AIProviderConfig | null>(null);
  const [form, setForm] = useState<AIProviderConfig>(emptyProvider);
  const [showKey, setShowKey] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<number | null>(null);

  const sortedProviders = useMemo(
    () => [...providers].sort((a, b) => (a.priority || 0) - (b.priority || 0) || (a.id || 0) - (b.id || 0)),
    [providers]
  );

  const loadProviders = async () => {
    setLoading(true);
    try {
      setProviders(await getAIProviders());
    } catch (error) {
      console.error('加载AI配置失败:', error);
      alert('加载AI配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
    setForm(emptyProvider);
    setShowKey(false);
  };

  const openCreate = () => {
    const nextPriority = sortedProviders.length
      ? Math.max(...sortedProviders.map((item) => item.priority || 100)) + 10
      : 100;
    setEditing(null);
    setForm({ ...emptyProvider, priority: nextPriority });
    setShowKey(false);
    setShowModal(true);
  };

  const openEdit = (provider: AIProviderConfig) => {
    setEditing(provider);
    setForm({ ...provider });
    setShowKey(false);
    setShowModal(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) return '请输入配置名称';
    if (!form.model_name.trim()) return '请输入模型名称';
    if (!form.api_key.trim()) return '请输入API Key';
    if (!form.base_url.trim()) return '请输入API地址';
    return '';
  };

  const saveProvider = async () => {
    const error = validateForm();
    if (error) return alert(error);

    setSaving(true);
    try {
      const payload = {
        ...form,
        priority: Number(form.priority) || 100,
        timeout_seconds: Number(form.timeout_seconds) || 30,
        max_tokens: Number(form.max_tokens) || 512,
        temperature: Number(form.temperature) || 0.7,
      };
      if (editing?.id) {
        await updateAIProvider(editing.id, payload);
      } else {
        await createAIProvider(payload);
      }
      await loadProviders();
      closeModal();
    } catch (error) {
      console.error('保存AI配置失败:', error);
      alert('保存AI配置失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = async (provider: AIProviderConfig) => {
    if (!provider.id) return;
    try {
      await updateAIProvider(provider.id, { ...provider, enabled: !provider.enabled });
      await loadProviders();
    } catch (error) {
      console.error('切换AI配置失败:', error);
      alert('切换AI配置失败');
    }
  };

  const removeProvider = async (provider: AIProviderConfig) => {
    if (!provider.id) return;
    if (!confirm(`确定删除「${provider.name}」吗？`)) return;
    try {
      await deleteAIProvider(provider.id);
      await loadProviders();
    } catch (error) {
      console.error('删除AI配置失败:', error);
      alert('删除AI配置失败');
    }
  };

  const testProvider = async (provider: AIProviderConfig) => {
    if (!provider.id) return;
    setTestingProviderId(provider.id);
    try {
      const result = await testAIProvider(provider.id);
      alert(`测试成功\n\n发送：你好\n回复：${result.reply || result.message || '模型已响应'}`);
    } catch (error) {
      console.error('测试AI配置失败:', error);
      alert('测试AI配置失败：' + (error as Error).message);
    } finally {
      setTestingProviderId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFE815]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">AI配置</h2>
          <p className="text-gray-500 mt-2 font-medium">配置多方AI API和优先级，失败或空回复时自动切换到下一个。</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadProviders} className="px-5 py-3 rounded-2xl font-bold bg-white text-gray-700 border border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button onClick={openCreate} className="ios-btn-primary px-5 py-3 rounded-2xl font-bold shadow-lg shadow-yellow-200 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新增配置
          </button>
        </div>
      </div>

      <section className="ios-card rounded-[2rem] p-6 bg-white">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#FFE815] flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-gray-900">降级顺序</h3>
            <p className="text-sm text-gray-500">优先级数字越小越先调用；禁用的配置会被跳过。</p>
          </div>
        </div>

        {sortedProviders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">暂无AI配置，请先新增一个供应商。</div>
        ) : (
          <div className="space-y-3">
            {sortedProviders.map((provider) => (
              <div key={provider.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${provider.enabled ? 'bg-[#FFE815]' : 'bg-gray-200'}`}>
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-gray-900 truncate">{provider.name}</h4>
                      {provider.enabled && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      P{provider.priority} · {providerTypeLabels[provider.provider_type] || provider.provider_type} · {provider.model_name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{provider.base_url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleProvider(provider)}
                    className={`ios-switch scale-75 ${provider.enabled ? 'bg-[#FFE815]' : 'bg-gray-300'}`}
                    title={provider.enabled ? '禁用' : '启用'}
                  >
                    <span className={`ios-switch-thumb ${provider.enabled ? 'ios-switch-thumb-on' : ''}`} />
                  </button>
                  <button onClick={() => openEdit(provider)} className="p-2 rounded-xl bg-white hover:bg-gray-100 text-gray-500" title="编辑">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => testProvider(provider)}
                    disabled={testingProviderId === provider.id}
                    className="p-2 rounded-xl bg-white hover:bg-gray-100 text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    title="发送“你好”测试模型"
                  >
                    {testingProviderId === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                  <button onClick={() => removeProvider(provider)} className="p-2 rounded-xl bg-white hover:bg-red-50 text-red-500" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && createPortal(
        <div className="modal-overlay-centered">
          <div className="modal-container" style={{ maxWidth: '860px' }}>
            <div className="modal-header flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                  <Bot className="w-6 h-6 text-gray-700" />
                  {editing ? '编辑AI配置' : '新增AI配置'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">OpenAI兼容接口填写服务商给出的 base_url，不需要补 `/chat/completions`。</p>
              </div>
              <button
                onClick={closeModal}
                className="w-10 h-10 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0 inline-flex items-center justify-center"
                title="关闭"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="modal-body space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">配置名称</label>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full ios-input px-4 py-3 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">供应商类型</label>
                  <select value={form.provider_type} onChange={(event) => setForm({ ...form, provider_type: event.target.value })} className="w-full ios-input px-4 py-3 rounded-xl">
                    <option value="openai">OpenAI兼容</option>
                    <option value="dashscope">DashScope应用</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">模型</label>
                  <input value={form.model_name} onChange={(event) => setForm({ ...form, model_name: event.target.value })} className="w-full ios-input px-4 py-3 rounded-xl font-mono text-sm" placeholder="minimaxai/minimax-m2.7" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">优先级</label>
                  <input type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} className="w-full ios-input px-4 py-3 rounded-xl" min="1" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">API地址</label>
                  <input value={form.base_url} onChange={(event) => setForm({ ...form, base_url: event.target.value })} className="w-full ios-input px-4 py-3 rounded-xl font-mono text-sm" placeholder="https://integrate.api.nvidia.com/v1" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">API Key</label>
                  <div className="relative">
                    <input type={showKey ? 'text' : 'password'} value={form.api_key} onChange={(event) => setForm({ ...form, api_key: event.target.value })} className="w-full ios-input px-4 py-3 pr-12 rounded-xl font-mono text-sm" />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">超时秒数</label>
                  <input type="number" value={form.timeout_seconds} onChange={(event) => setForm({ ...form, timeout_seconds: Number(event.target.value) })} className="w-full ios-input px-4 py-3 rounded-xl" min="5" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Max Tokens</label>
                  <input type="number" value={form.max_tokens} onChange={(event) => setForm({ ...form, max_tokens: Number(event.target.value) })} className="w-full ios-input px-4 py-3 rounded-xl" min="64" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Temperature</label>
                  <input type="number" step="0.1" value={form.temperature} onChange={(event) => setForm({ ...form, temperature: Number(event.target.value) })} className="w-full ios-input px-4 py-3 rounded-xl" min="0" max="2" />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => setForm({ ...form, enabled: !form.enabled })} className={`ios-switch ${form.enabled ? 'bg-[#FFE815]' : 'bg-gray-300'}`}>
                    <span className={`ios-switch-thumb ${form.enabled ? 'ios-switch-thumb-on' : ''}`} />
                  </button>
                  <span className="ml-3 text-sm font-bold text-gray-700">{form.enabled ? '启用' : '禁用'}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="flex gap-3 w-full">
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  onClick={saveProvider}
                  disabled={saving}
                  className="flex-1 ios-btn-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? '保存中...' : '保存配置'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AIConfig;
