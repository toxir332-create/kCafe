import React, { useState } from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { Plus, CreditCard as Edit, ToggleLeft, ToggleRight, Clock, DollarSign, Trash2, X, Settings, Edit3, FolderPlus } from 'lucide-react';

interface AddMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: any) => void;
  categories: string[];
  initialCategory?: string;
}

interface EditMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (itemId: string, updates: any) => void;
  item: MenuItem | null;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onUpdateCategories: (categories: string[]) => void;
}

const AddMenuItemModal: React.FC<AddMenuItemModalProps> = ({ isOpen, onClose, onAdd, categories, initialCategory }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    ingredients: '',
    preparationTime: ''
  });

  React.useEffect(() => {
    if (isOpen) {
      const fallback = (categories || []).find(c => c !== 'Barchasi') || 'Boshqa';
      const nextCat = initialCategory && initialCategory !== 'Barchasi' ? initialCategory : fallback;
      setFormData(prev => ({ ...prev, category: nextCat }));
    }
  }, [isOpen, initialCategory, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem = {
      name: formData.name,
      description: '',
      price: parseFloat(formData.price),
      category: formData.category || 'Boshqa',
      ingredients: [],
      isAvailable: true,
      preparationTime: 15
    };
    onAdd(newItem);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      ingredients: '',
      preparationTime: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl rounded-none p-4 sm:p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Yangi Taom Qo'shish</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Narxi (so'm)</label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {(categories || ['Boshqa']).filter(c => c !== 'Barchasi').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Optional fields hidden by default; provide sensible defaults */}
          <input type="hidden" value={formData.description} readOnly />
          <input type="hidden" value={formData.category} readOnly />
          <input type="hidden" value={formData.ingredients} readOnly />
          <input type="hidden" value={formData.preparationTime} readOnly />
          
          <div className="flex gap-2 pt-4 flex-col sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
            >
              Qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditMenuItemModal: React.FC<EditMenuItemModalProps> = ({ isOpen, onClose, onEdit, item }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    ingredients: '',
    preparationTime: ''
  });

  React.useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        category: item.category,
        ingredients: item.ingredients.join(', '),
        preparationTime: item.preparationTime.toString()
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    
    const updates = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      category: formData.category,
      ingredients: formData.ingredients.split(',').map(i => i.trim()),
      preparationTime: parseInt(formData.preparationTime)
    };
    onEdit(item.id, updates);
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Taomni Tahrirlash</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tavsifi</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Narxi (so'm)</label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Masalliqlar (vergul bilan ajrating)</label>
            <input
              type="text"
              required
              value={formData.ingredients}
              onChange={(e) => setFormData({...formData, ingredients: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="pomidor, pishloq, go'sht"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tayyorlash vaqti (daqiqa)</label>
            <input
              type="number"
              required
              value={formData.preparationTime}
              onChange={(e) => setFormData({...formData, preparationTime: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2 pt-4 flex-col sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
            >
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({ isOpen, onClose, categories, onUpdateCategories }) => {
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  React.useEffect(() => {
    setCategoryList(categories.filter(cat => cat !== 'Barchasi'));
  }, [categories]);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categoryList.includes(newCategory.trim())) {
      const updated = [...categoryList, newCategory.trim()];
      setCategoryList(updated);
      onUpdateCategories(['Barchasi', ...updated]);
      setNewCategory('');
    }
  };

  const handleEditCategory = (oldCategory: string) => {
    setEditingCategory(oldCategory);
    setEditValue(oldCategory);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== editingCategory) {
      const updated = categoryList.map(cat => 
        cat === editingCategory ? editValue.trim() : cat
      );
      setCategoryList(updated);
      onUpdateCategories(['Barchasi', ...updated]);
    }
    setEditingCategory(null);
    setEditValue('');
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    if (confirm(`"${categoryToDelete}" kategoriyasini o'chirmoqchimisiz? Bu kategoriyadagi barcha taomlar "Boshqa" kategoriyasiga o'tkaziladi.`)) {
      const updated = categoryList.filter(cat => cat !== categoryToDelete);
      setCategoryList(updated);
      onUpdateCategories(['Barchasi', ...updated]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Kategoriyalarni Boshqarish</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Add new category */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Yangi kategoriya nomi"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[44px]"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Category list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categoryList.map((category, index) => (
              <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                {editingCategory === category ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Saqlash
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      Bekor
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{category}</span>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  ingredients: string[];
  isAvailable: boolean;
  preparationTime: number;
}

interface MenuItemCardProps {
  item: MenuItem;
  onToggleAvailability: (itemId: string, isAvailable: boolean) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: string) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onToggleAvailability, onEditItem, onDeleteItem }) => {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 ${
      !item.isAvailable ? 'opacity-60' : ''
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {item.category}
          </span>
        </div>
        <button
          onClick={() => onToggleAvailability(item.id, !item.isAvailable)}
          className="ml-4"
        >
          {item.isAvailable ? (
            <ToggleRight className="w-6 h-6 text-green-600" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-gray-400" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center">
          <DollarSign className="w-4 h-4 mr-1" />
          <span className="font-semibold text-lg text-gray-900">{item.price.toLocaleString()} so'm</span>
        </div>
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          <span>{item.preparationTime} daqiqa</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Masalliqlar:</p>
        <div className="flex flex-wrap gap-1">
          {item.ingredients.map((ingredient, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {ingredient}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEditItem(item)}
          className="flex-1 flex items-center justify-center py-2 px-4 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium text-blue-700 transition-colors"
        >
          <Edit className="w-4 h-4 mr-2" />
          Tahrirlash
        </button>
        <button
          onClick={() => onDeleteItem(item.id)}
          className="flex-1 flex items-center justify-center py-2 px-4 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium text-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          O'chirish
        </button>
      </div>
    </div>
  );
};

export const MenuManagement: React.FC = () => {
  const { menuItems, updateMenuItem, addMenuItem, deleteMenuItem } = useRestaurant();
  const [selectedCategory, setSelectedCategory] = useState<string>('Barchasi');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('menu_categories');
      const base = raw ? (JSON.parse(raw) as string[]) : ['Barchasi', 'Boshqa'];
      const withDefaults = Array.from(new Set(['Barchasi', ...base.filter(c => c !== 'Barchasi')]));
      localStorage.setItem('menu_categories', JSON.stringify(withDefaults));
      return withDefaults;
    } catch {
      return ['Barchasi', 'Boshqa'];
    }
  });

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('menu_categories');
      const saved = raw ? (JSON.parse(raw) as string[]) : [];
      const fromItems = Array.from(new Set(menuItems.map(item => item.category)));
      const next = Array.from(new Set(['Barchasi', ...saved.filter(c => c !== 'Barchasi'), ...fromItems]));
      setCategories(next);
      localStorage.setItem('menu_categories', JSON.stringify(next));
    } catch {
      const fromItems = Array.from(new Set(menuItems.map(item => item.category)));
      const next = Array.from(new Set(['Barchasi', ...fromItems]));
      setCategories(next);
    }
  }, [menuItems]);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'Barchasi' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggleAvailability = (itemId: string, isAvailable: boolean) => {
    updateMenuItem(itemId, { isAvailable });
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleEditItemSubmit = (itemId: string, updates: any) => {
    updateMenuItem(itemId, updates);
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleUpdateCategories = (newCategories: string[]) => {
    const normalized = Array.from(new Set(['Barchasi', ...newCategories.filter(c => c !== 'Barchasi')]));
    setCategories(normalized);
    try {
      localStorage.setItem('menu_categories', JSON.stringify(normalized));
    } catch {}
    // Update menu items that belong to deleted categories
    const deletedCategories = categories.filter(cat => !normalized.includes(cat) && cat !== 'Barchasi');
    if (deletedCategories.length > 0) {
      menuItems.forEach(item => {
        if (deletedCategories.includes(item.category)) {
          updateMenuItem(item.id, { category: 'Boshqa' });
        }
      });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Haqiqatan ham bu taomni o\'chirmoqchimisiz?')) {
      deleteMenuItem(itemId);
    }
  };

  const handleAddItem = (newItem: any) => {
    addMenuItem(newItem);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Menyu Boshqaruvi</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="flex-1 sm:flex-initial items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors min-h-[42px]"
          >
            <Settings className="w-4 h-4 mr-2" />
            Kategoriyalar
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[42px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yangi Taom Qo'shish
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Taomlarni qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredItems.map(item => (
          <MenuItemCard
            key={item.id}
            item={item}
            onToggleAvailability={handleToggleAvailability}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Menyu topilmadi</p>
          <p className="text-gray-400 text-sm mt-2">
            Qidiruv mezonlarini o'zgartiring yoki menyuga yangi taomlar qo'shing
          </p>
        </div>
      )}

      <AddMenuItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
        categories={categories}
        initialCategory={selectedCategory}
      />

      <EditMenuItemModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        onEdit={handleEditItemSubmit}
        item={editingItem}
      />

      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        onUpdateCategories={handleUpdateCategories}
      />
    </div>
  );
};