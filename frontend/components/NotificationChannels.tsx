import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Bot,
  Check,
  Edit2,
  Link,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Send,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  createNotificationChannel,
  deleteNotificationChannel,
  getAccountDetails,
  getAccountMessageNotifications,
  getNotificationChannels,
  setMessageNotification,
  updateNotificationChannel,
} from '../services/api';
import { AccountDetail } from '../types';

type ChannelType = 'feishu' | 'dingtalk' | 'bark' | 'email' | 'webhook' | 'wechat' | 'telegram';

interface NotificationChannel {
  id: string;
  name: string;
  type: ChannelType;
  config: Record<string, unknown>;
  enabled: boolean;
}

const channelTypes: Array<{
  type: ChannelType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultConfig: Record<string, unknown>;
}> = [
  {
    type: 'feishu',
    label: '飞书通知',
    description: '飞书群机器人 Webhook',
    icon: Send,
    defaultConfig: {
      webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/',
      secret: '',
    },
  },
  {
    type: 'dingtalk',
    label: '钉钉通知',
    description: '钉钉群机器人 Webhook',
    icon: Bell,
    defaultConfig: {
      webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=',
      secret: '',
    },
  },
  {
    type: 'bark',
    label: 'Bark',
    description: 'iOS Bark 推送',
    icon: Smartphone,
    defaultConfig: {
      server_url: 'https://api.day.app',
      device_key: '',
      title: '闲鱼通知',
    },
  },
  {
    type: 'email',
    label: '邮件',
    description: 'SMTP 邮件通知',
    icon: Mail,
    defaultConfig: {
      smtp_server: 'smtp.qq.com',
      smtp_port: 587,
      email_user: '',
      email_password: '',
      recipient_email: '',
      smtp_use_tls: true,
    },
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: '自定义 HTTP 通知',
    icon: Link,
    defaultConfig: {
      webhook_url: 'https://',
      http_method: 'POST',
      headers: '{}',
    },
  },
  {
    type: 'wechat',
    label: '企业微信',
    description: '企业微信群机器人',
    icon: MessageCircle,
    defaultConfig: {
      webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=',
    },
  },
  {
    type: 'telegram',
    label: 'Telegram',
    description: 'Telegram Bot 消息',
    icon: Bot,
    defaultConfig: {
      bot_token: '',
      chat_id: '',
    },
  },
];

const formatConfig = (config: Record<string, unknown>) => JSON.stringify(config, null, 2);

const NotificationChannels: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [accounts, setAccounts] = useState<AccountDetail[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accountNotifications, setAccountNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'feishu' as ChannelType,
    config: formatConfig(channelTypes[0].defaultConfig),
    enabled: true,
  });

  const selectedType = useMemo(
    () => channelTypes.find((item) => item.type === form.type) || channelTypes[0],
    [form.type]
  );

  const loadChannels = async () => {
    const result = await getNotificationChannels();
    setChannels((result.data || []) as NotificationChannel[]);
  };

  const loadAccounts = async () => {
    const list = await getAccountDetails();
    setAccounts(list);
    if (!selectedAccount && list.length > 0) {
      setSelectedAccount(list[0].id);
    }
  };

  const loadAccountNotifications = async (cookieId: string) => {
    if (!cookieId) {
      setAccountNotifications([]);
      return;
    }
    const list = await getAccountMessageNotifications(cookieId);
    setAccountNotifications(list || []);
  };

  const reload = async () => {
    setLoading(true);
    try {
      await Promise.all([loadChannels(), loadAccounts()]);
    } catch (error) {
      console.error('加载通知配置失败:', error);
      alert('加载通知配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAccountNotifications(selectedAccount).catch((error) => {
      console.error('加载账号通知失败:', error);
    });
  }, [selectedAccount]);

  const openCreateModal = (type: ChannelType = 'feishu') => {
    const typeConfig = channelTypes.find((item) => item.type === type) || channelTypes[0];
    setEditingChannel(null);
    setForm({
      name: typeConfig.label,
      type,
      config: formatConfig(typeConfig.defaultConfig),
      enabled: true,
    });
    setShowModal(true);
  };

  const openEditModal = (channel: NotificationChannel) => {
    setEditingChannel(channel);
    setForm({
      name: channel.name,
      type: channel.type,
      config: formatConfig(channel.config || {}),
      enabled: channel.enabled,
    });
    setShowModal(true);
  };

  const handleSaveChannel = async () => {
    if (!form.name.trim()) return alert('请输入渠道名称');

    let parsedConfig: Record<string, unknown>;
    try {
      parsedConfig = JSON.parse(form.config || '{}');
    } catch {
      return alert('配置 JSON 格式错误');
    }

    setSaving(true);
    try {
      if (editingChannel) {
        await updateNotificationChannel(editingChannel.id, {
          name: form.name.trim(),
          config: parsedConfig,
          enabled: form.enabled,
        });
      } else {
        await createNotificationChannel({
          name: form.name.trim(),
          type: form.type,
          config: parsedConfig,
        });
      }
      setShowModal(false);
      await loadChannels();
    } catch (error) {
      console.error('保存通知渠道失败:', error);
      alert('保存通知渠道失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChannel = async (channel: NotificationChannel) => {
    try {
      await updateNotificationChannel(channel.id, {
        name: channel.name,
        config: channel.config,
        enabled: !channel.enabled,
      });
      await loadChannels();
    } catch (error) {
      console.error('切换通知渠道失败:', error);
      alert('切换通知渠道失败');
    }
  };

  const handleDeleteChannel = async (channel: NotificationChannel) => {
    if (!confirm(`确定删除通知渠道「${channel.name}」吗？`)) return;
    try {
      await deleteNotificationChannel(channel.id);
      await loadChannels();
      if (selectedAccount) await loadAccountNotifications(selectedAccount);
    } catch (error) {
      console.error('删除通知渠道失败:', error);
      alert('删除通知渠道失败');
    }
  };

  const isBoundToAccount = (channelId: string) => {
    return accountNotifications.some((item) => String(item.channel_id) === String(channelId) && item.enabled);
  };

  const handleToggleAccountBinding = async (channel: NotificationChannel) => {
    if (!selectedAccount) return alert('请先选择账号');
    try {
      await setMessageNotification(selectedAccount, Number(channel.id), !isBoundToAccount(channel.id));
      await loadAccountNotifications(selectedAccount);
    } catch (error) {
      console.error('设置账号通知失败:', error);
      alert('设置账号通知失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFE815]" />
      </div>
    );
  }

  const SelectedIcon = selectedType.icon;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">通知渠道</h2>
          <p className="text-gray-500 mt-2 font-medium">配置飞书等通知渠道，并绑定到需要提醒的闲鱼账号。</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={reload}
            className="px-5 py-3 rounded-2xl font-bold bg-white text-gray-700 border border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button
            onClick={() => openCreateModal('feishu')}
            className="ios-btn-primary px-5 py-3 rounded-2xl font-bold shadow-lg shadow-yellow-200 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增飞书
          </button>
        </div>
      </div>

      <section className="ios-card rounded-[2rem] p-6 bg-white">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900">可用渠道</h3>
            <p className="text-sm text-gray-500 mt-1">飞书机器人需要填写群机器人 Webhook，签名密钥按需填写。</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channelTypes.map((typeConfig) => {
            const Icon = typeConfig.icon;
            const existingChannels = channels.filter((channel) => channel.type === typeConfig.type);
            return (
              <div key={typeConfig.type} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm text-gray-700 flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-gray-900">{typeConfig.label}</h4>
                      <p className="text-xs text-gray-500 mt-1">{typeConfig.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateModal(typeConfig.type)}
                    className="p-2 rounded-xl bg-white hover:bg-gray-100 text-gray-600 transition-colors flex-shrink-0"
                    title={`新增${typeConfig.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {existingChannels.length === 0 ? (
                    <div className="text-sm text-gray-400 py-3">尚未配置</div>
                  ) : (
                    existingChannels.map((channel) => (
                      <div key={channel.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-gray-900 truncate">{channel.name}</div>
                          <div className={`text-xs mt-0.5 ${channel.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                            {channel.enabled ? '已启用' : '已禁用'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleChannel(channel)}
                            className={`ios-switch scale-75 ${channel.enabled ? 'bg-[#FFE815]' : 'bg-gray-300'}`}
                            title={channel.enabled ? '禁用渠道' : '启用渠道'}
                          >
                            <span className={`ios-switch-thumb ${channel.enabled ? 'ios-switch-thumb-on' : ''}`} />
                          </button>
                          <button onClick={() => openEditModal(channel)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="编辑">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteChannel(channel)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ios-card rounded-[2rem] p-6 bg-white">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900">账号通知绑定</h3>
            <p className="text-sm text-gray-500 mt-1">绑定后，该账号收到买家消息、风控验证或发货异常时会发送通知。</p>
          </div>
          <select
            value={selectedAccount}
            onChange={(event) => setSelectedAccount(event.target.value)}
            className="ios-input px-4 py-3 rounded-xl min-w-[260px]"
          >
            <option value="">请选择账号</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.remark || account.nickname || account.id}
              </option>
            ))}
          </select>
        </div>

        {channels.length === 0 ? (
          <div className="text-center py-16 text-gray-400">暂无通知渠道，请先新增飞书通知</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {channels.map((channel) => {
              const typeConfig = channelTypes.find((item) => item.type === channel.type);
              const Icon = typeConfig?.icon || Bell;
              const bound = isBoundToAccount(channel.id);
              return (
                <button
                  key={channel.id}
                  onClick={() => handleToggleAccountBinding(channel)}
                  disabled={!selectedAccount || !channel.enabled}
                  className={`text-left rounded-2xl border p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    bound
                      ? 'border-[#FFE815] bg-yellow-50 shadow-sm'
                      : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-5 h-5 text-gray-700 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{channel.name}</div>
                        <div className="text-xs text-gray-500">{typeConfig?.label || channel.type}</div>
                      </div>
                    </div>
                    {bound && <Check className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {showModal && createPortal(
        <div className="modal-overlay-centered">
          <div className="modal-container" style={{ maxWidth: '720px' }}>
            <div className="modal-header flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                  <SelectedIcon className="w-6 h-6 text-gray-700" />
                  {editingChannel ? '编辑通知渠道' : `新增${selectedType.label}`}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{selectedType.description}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0 inline-flex items-center justify-center"
                title="关闭"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="modal-body space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">渠道名称</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="w-full ios-input px-4 py-3 rounded-xl"
                    placeholder="例如：客服飞书群"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">渠道类型</label>
                  <select
                    value={form.type}
                    onChange={(event) => {
                      const nextType = event.target.value as ChannelType;
                      const nextConfig = channelTypes.find((item) => item.type === nextType) || channelTypes[0];
                      setForm({
                        ...form,
                        type: nextType,
                        name: editingChannel ? form.name : nextConfig.label,
                        config: editingChannel ? form.config : formatConfig(nextConfig.defaultConfig),
                      });
                    }}
                    className="w-full ios-input px-4 py-3 rounded-xl"
                    disabled={Boolean(editingChannel)}
                  >
                    {channelTypes.map((item) => (
                      <option key={item.type} value={item.type}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-bold text-gray-900">启用渠道</div>
                  <div className="text-xs text-gray-500 mt-1">禁用后账号绑定会保留，但不会发送通知</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, enabled: !form.enabled })}
                  className={`ios-switch ${form.enabled ? 'bg-[#FFE815]' : 'bg-gray-300'}`}
                >
                  <span className={`ios-switch-thumb ${form.enabled ? 'ios-switch-thumb-on' : ''}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">配置 JSON</label>
                <textarea
                  value={form.config}
                  onChange={(event) => setForm({ ...form, config: event.target.value })}
                  className="w-full ios-input px-4 py-3 rounded-xl h-56 resize-none font-mono text-sm"
                  spellCheck={false}
                />
                {form.type === 'feishu' && (
                  <p className="text-xs text-gray-500 mt-2">
                    飞书机器人未开启签名校验时，`secret` 留空即可；开启签名校验时填写机器人安全设置里的签名密钥。
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveChannel}
                  className="flex-1 ios-btn-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? '保存中...' : '保存'}
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

export default NotificationChannels;
