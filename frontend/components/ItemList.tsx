import React, { useEffect, useState } from 'react';
import { Item, AccountDetail } from '../types';
import {
  createItem,
  deleteItem,
  getAccountDetails,
  getItems,
  syncItemsFromAccount,
  updateItem,
  updateItemMultiQuantityDelivery,
  updateItemMultiSpec,
} from '../services/api';
import { Box, RefreshCw, ShoppingBag, Edit, Trash2, Plus, Save, X } from 'lucide-react';

type ItemForm = {
  cookie_id: string;
  item_id: string;
  item_title: string;
  item_price: string;
  item_category: string;
  item_image: string;
  item_description: string;
  item_detail: string;
  is_multi_spec: boolean;
  is_multi_qty_ship: boolean;
};

const emptyForm: ItemForm = {
  cookie_id: '',
  item_id: '',
  item_title: '',
  item_price: '',
  item_category: '',
  item_image: '',
  item_description: '',
  item_detail: '',
  is_multi_spec: false,
  is_multi_qty_ship: false,
};

const asBool = (value: unknown) => value === true || value === 1 || value === '1';

const formFromItem = (item: Item): ItemForm => ({
  cookie_id: item.cookie_id,
  item_id: item.item_id,
  item_title: item.item_title || '',
  item_price: item.item_price || '',
  item_category: item.item_category || '',
  item_image: item.item_image || '',
  item_description: item.item_description || '',
  item_detail: item.item_detail || '',
  is_multi_spec: asBool(item.is_multi_spec),
  is_multi_qty_ship: asBool(item.is_multi_qty_ship ?? item.multi_quantity_delivery),
});

const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<AccountDetail[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>(emptyForm);
  const [addForm, setAddForm] = useState<ItemForm>(emptyForm);

  const reloadItems = async () => {
    const list = await getItems();
    setItems(list);
  };

  useEffect(() => {
    getAccountDetails().then(setAccounts);
    reloadItems();
  }, []);

  const handleSync = async () => {
    if (!selectedAccount) return alert('请先选择账号');
    setLoading(true);
    try {
      await syncItemsFromAccount(selectedAccount);
      await reloadItems();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setEditForm(formFromItem(item));
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await updateItem(selectedItem.cookie_id, selectedItem.item_id, {
        item_title: editForm.item_title,
        item_price: editForm.item_price,
        item_category: editForm.item_category,
        item_image: editForm.item_image,
        item_description: editForm.item_description,
        item_detail: editForm.item_detail,
        is_multi_spec: editForm.is_multi_spec,
        multi_quantity_delivery: editForm.is_multi_qty_ship,
      });
      await reloadItems();
      setShowEditModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('更新商品失败:', error);
      alert('更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    if (!confirm(`确认删除商品"${item.item_title || item.item_id}"吗？`)) return;
    try {
      await deleteItem(item.cookie_id, item.item_id);
      await reloadItems();
    } catch (error) {
      console.error('删除商品失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleAddItem = async () => {
    if (!addForm.cookie_id) return alert('请选择账号');
    if (!addForm.item_id.trim()) return alert('请填写商品ID');
    setSaving(true);
    try {
      await createItem(addForm.cookie_id, {
        item_id: addForm.item_id.trim(),
        item_title: addForm.item_title,
        item_price: addForm.item_price,
        item_category: addForm.item_category,
        item_image: addForm.item_image,
        item_description: addForm.item_description,
        item_detail: addForm.item_detail,
        is_multi_spec: addForm.is_multi_spec,
        multi_quantity_delivery: addForm.is_multi_qty_ship,
      });
      await reloadItems();
      setShowAddModal(false);
      setAddForm(emptyForm);
    } catch (error) {
      console.error('添加商品失败:', error);
      alert('添加失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const toggleMultiSpec = async (item: Item) => {
    const nextValue = !asBool(item.is_multi_spec);
    try {
      await updateItemMultiSpec(item.cookie_id, item.item_id, nextValue);
      setItems((current) =>
        current.map((entry) =>
          entry.cookie_id === item.cookie_id && entry.item_id === item.item_id
            ? { ...entry, is_multi_spec: nextValue }
            : entry
        )
      );
    } catch (error) {
      console.error('切换多规格失败:', error);
      alert('切换失败，请重试');
    }
  };

  const toggleMultiQty = async (item: Item) => {
    const nextValue = !asBool(item.is_multi_qty_ship ?? item.multi_quantity_delivery);
    try {
      await updateItemMultiQuantityDelivery(item.cookie_id, item.item_id, nextValue);
      setItems((current) =>
        current.map((entry) =>
          entry.cookie_id === item.cookie_id && entry.item_id === item.item_id
            ? { ...entry, is_multi_qty_ship: nextValue, multi_quantity_delivery: nextValue }
            : entry
        )
      );
    } catch (error) {
      console.error('切换多数量发货失败:', error);
      alert('切换失败，请重试');
    }
  };

  const renderForm = (form: ItemForm, setForm: React.Dispatch<React.SetStateAction<ItemForm>>, isEdit: boolean) => (
    <div className="space-y-4">
      {!isEdit && (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">所属账号</label>
          <select
            className="ios-input w-full px-4 py-3 rounded-xl"
            value={form.cookie_id}
            onChange={(e) => setForm((prev) => ({ ...prev, cookie_id: e.target.value }))}
          >
            <option value="">请选择账号</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nickname || account.remark || account.id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">商品ID</label>
          <input
            className="ios-input w-full px-4 py-3 rounded-xl disabled:bg-gray-100"
            value={form.item_id}
            disabled={isEdit}
            onChange={(e) => setForm((prev) => ({ ...prev, item_id: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">价格</label>
          <input
            className="ios-input w-full px-4 py-3 rounded-xl"
            value={form.item_price}
            onChange={(e) => setForm((prev) => ({ ...prev, item_price: e.target.value }))}
            placeholder="99.00"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">商品标题</label>
        <input
          className="ios-input w-full px-4 py-3 rounded-xl"
          value={form.item_title}
          onChange={(e) => setForm((prev) => ({ ...prev, item_title: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">分类</label>
        <input
          className="ios-input w-full px-4 py-3 rounded-xl"
          value={form.item_category}
          onChange={(e) => setForm((prev) => ({ ...prev, item_category: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">图片URL</label>
        <input
          className="ios-input w-full px-4 py-3 rounded-xl"
          value={form.item_image}
          onChange={(e) => setForm((prev) => ({ ...prev, item_image: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">描述</label>
        <textarea
          className="ios-input w-full px-4 py-3 rounded-xl min-h-[84px]"
          value={form.item_description}
          onChange={(e) => setForm((prev) => ({ ...prev, item_description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <span className="font-bold text-gray-800">多规格</span>
          <input
            type="checkbox"
            checked={form.is_multi_spec}
            onChange={(e) => setForm((prev) => ({ ...prev, is_multi_spec: e.target.checked }))}
          />
        </label>
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <span className="font-bold text-gray-800">多数量发货</span>
          <input
            type="checkbox"
            checked={form.is_multi_qty_ship}
            onChange={(e) => setForm((prev) => ({ ...prev, is_multi_qty_ship: e.target.checked }))}
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">商品管理</h2>
          <p className="text-gray-500 mt-2 text-sm">监控并管理所有账号下的闲鱼商品。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className="ios-input px-4 py-3 rounded-xl text-sm"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="">选择账号以同步</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nickname || account.remark || account.id}
              </option>
            ))}
          </select>
          <button
            onClick={handleSync}
            disabled={loading || !selectedAccount}
            className="ios-btn-primary flex items-center gap-2 px-6 py-3 rounded-2xl font-bold shadow-lg shadow-yellow-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            同步商品
          </button>
          <button
            onClick={() => {
              setAddForm({ ...emptyForm, cookie_id: selectedAccount });
              setShowAddModal(true);
            }}
            className="px-5 py-3 rounded-2xl font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            添加商品
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={`${item.cookie_id}-${item.item_id}`} className="ios-card p-4 rounded-3xl hover:shadow-lg transition-all group relative">
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={() => handleEdit(item)}
                className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-md hover:bg-[#FFE815] transition-colors"
                title="编辑"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-md hover:bg-red-100 text-red-500 transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-square bg-gray-100 rounded-2xl mb-4 overflow-hidden relative">
              {item.item_image ? (
                <img src={item.item_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Box className="w-10 h-10" />
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg">
                ¥{item.item_price || '-'}
              </div>
            </div>
            <h3 className="font-bold text-gray-900 line-clamp-2 text-sm mb-2 h-10">{item.item_title || '未命名商品'}</h3>
            <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
              <span className="bg-gray-100 px-2 py-1 rounded-md truncate max-w-[140px]">ID: {item.item_id}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleMultiSpec(item)}
                className={`flex-1 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors ${
                  asBool(item.is_multi_spec) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                多规格
              </button>
              <button
                onClick={() => toggleMultiQty(item)}
                className={`flex-1 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors ${
                  asBool(item.is_multi_qty_ship ?? item.multi_quantity_delivery)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                多数量发货
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
            暂无商品数据，请选择账号进行同步
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-extrabold text-gray-900">编辑商品</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderForm(editForm, setEditForm, true)}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-6 py-3 rounded-xl bg-gray-100 font-bold text-gray-700">
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 ios-btn-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-extrabold text-gray-900">添加商品</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderForm(addForm, setAddForm, false)}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-6 py-3 rounded-xl bg-gray-100 font-bold text-gray-700">
                取消
              </button>
              <button
                onClick={handleAddItem}
                disabled={saving}
                className="flex-1 ios-btn-primary px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemList;
