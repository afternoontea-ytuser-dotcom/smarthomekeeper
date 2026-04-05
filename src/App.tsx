/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Calendar, 
  ClipboardCheck, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Refrigerator, 
  X,
  CheckCircle2,
  Share2,
  Info,
  Download,
  Copy,
  Check,
  Sparkles,
  ChefHat,
  Utensils,
  Loader2,
  Palette,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface BilingualRecipe {
  zh: string;
  en: string;
}

interface BaseItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  quantity: number;
  unit: string;
  minQuantity: number;
}

interface FoodItem extends BaseItem {
  expiryDate: string;
}

interface HouseholdItem extends BaseItem {}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

// --- Constants ---
const STORAGE_KEY_FOOD = 'smart_home_food_items';
const STORAGE_KEY_HOUSEHOLD = 'smart_home_household_items';
const STORAGE_KEY_LAST_BRIEFING = 'smart_home_last_briefing_date';
const STORAGE_KEY_API_KEY = 'smart_home_user_api_key';

const CATEGORIES = {
  food: ['蔬菜', '水果', '肉類', '海鮮', '乳製品', '零食', '飲料', '調味料', '其他'],
  household: ['清潔用品', '個人護理', '廚房用品', '衛浴用品', '五金工具', '文具', '其他']
};

const THEME_COLORS = {
  indigo: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
    500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b',
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337',
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
    500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95',
  },
};

const THEMES = [
  { id: 'indigo', name: '經典藍', color: '#4f46e5' },
  { id: 'emerald', name: '清新綠', color: '#059669' },
  { id: 'rose', name: '浪漫粉', color: '#e11d48' },
  { id: 'amber', name: '溫暖橘', color: '#d97706' },
  { id: 'violet', name: '優雅紫', color: '#7c3aed' },
];

// --- Components ---
interface ItemRowProps {
  item: FoodItem | HouseholdItem;
  onDelete: (id: string) => void;
  onCalendar?: (item: FoodItem) => string;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, onDelete, onCalendar }) => {
  const isFood = 'expiryDate' in item;
  const isExpiring = isFood && (item as FoodItem).expiryDate === new Date().toISOString().split('T')[0];
  const isLowStock = item.quantity <= item.minQuantity;
  
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-brand-300 transition-all group shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[200px] space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-bold rounded uppercase tracking-wider">
              {item.category}
            </span>
            <h4 className="font-bold text-slate-800">{item.name}</h4>
            <span className="text-slate-400 text-xs">| {item.brand}</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-700">${item.price}</span>
            </div>
            {isFood && (
              <div className={`flex items-center gap-1 ${isExpiring ? 'text-orange-600 font-bold' : ''}`}>
                <Calendar className="w-3 h-3" />
                <span>到期：{(item as FoodItem).expiryDate}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">當前庫存</span>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLowStock ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                {item.quantity} {item.unit}
              </div>
            </div>
            {isLowStock && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                <span>低於安全庫存 ({item.minQuantity})</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-center">
          {isFood && isExpiring && onCalendar && (
            <a 
              href={onCalendar(item as FoodItem)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors"
              title="安排今晚煮掉"
            >
              <Calendar className="w-4 h-4" />
            </a>
          )}
          <button 
            onClick={() => onDelete(item.id)}
            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // --- State ---
  const [foodItems, setFoodItems] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FOOD);
    return saved ? JSON.parse(saved) : [
      { id: '1', name: '菠菜', category: '蔬菜', brand: '有機農場', price: 35, quantity: 2, unit: '把', minQuantity: 1, expiryDate: new Date().toISOString().split('T')[0] },
      { id: '2', name: '鮮奶', category: '乳製品', brand: '瑞穗', price: 95, quantity: 1, unit: '瓶', minQuantity: 1, expiryDate: new Date().toISOString().split('T')[0] },
      { id: '3', name: '雞蛋', category: '乳製品', brand: '大武山', price: 120, quantity: 10, unit: '顆', minQuantity: 4, expiryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
    ];
  });

  const [householdItems, setHouseholdItems] = useState<HouseholdItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HOUSEHOLD);
    return saved ? JSON.parse(saved) : [
      { id: '1', name: '衛生紙', category: '個人護理', brand: '舒潔', price: 250, quantity: 2, unit: '串', minQuantity: 1 },
      { id: '2', name: '洗潔精', category: '清潔用品', brand: '泡舒', price: 89, quantity: 0, unit: '瓶', minQuantity: 1 },
      { id: '3', name: '洗衣精', category: '清潔用品', brand: '一匙靈', price: 199, quantity: 1, unit: '瓶', minQuantity: 1 },
    ];
  });

  const [showBriefing, setShowBriefing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [newFood, setNewFood] = useState<Omit<FoodItem, 'id'>>({
    name: '',
    category: '蔬菜',
    brand: '',
    price: 0,
    quantity: 1,
    unit: '個',
    minQuantity: 1,
    expiryDate: ''
  });

  const [newHouse, setNewHouse] = useState<Omit<HouseholdItem, 'id'>>({
    name: '',
    category: '清潔用品',
    brand: '',
    price: 0,
    quantity: 1,
    unit: '個',
    minQuantity: 1
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [copying, setCopying] = useState(false);

  // --- Smart Recipe State ---
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([]);
  const [generatedRecipe, setGeneratedRecipe] = useState<BilingualRecipe | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('smart_home_theme') || 'indigo');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // --- Theme Persistence & Application ---
  useEffect(() => {
    localStorage.setItem('smart_home_theme', currentTheme);
    const colors = THEME_COLORS[currentTheme as keyof typeof THEME_COLORS];
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--brand-${key}`, value);
    });
  }, [currentTheme]);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FOOD, JSON.stringify(foodItems));
  }, [foodItems]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HOUSEHOLD, JSON.stringify(householdItems));
  }, [householdItems]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_API_KEY, userApiKey);
  }, [userApiKey]);

  // --- Toast Logic ---
  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- Daily Briefing Logic ---
  useEffect(() => {
    const today = new Date().toDateString();
    const lastBriefing = localStorage.getItem(STORAGE_KEY_LAST_BRIEFING);

    if (lastBriefing !== today) {
      setShowBriefing(true);
      localStorage.setItem(STORAGE_KEY_LAST_BRIEFING, today);
    }
  }, []);

  // --- Web Notifications Logic ---
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        addToast('通知權限已開啟！', 'success');
        checkAndNotify();
      }
    }
  };

  const checkAndNotify = () => {
    if (notificationPermission !== 'granted') return;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Check food
    foodItems.forEach(item => {
      if (item.expiryDate === tomorrowStr) {
        new Notification('🚨 冰箱警報', {
          body: `「${item.name}」明天到期，點擊查看推薦食譜！`,
          icon: 'https://cdn-icons-png.flaticon.com/512/2907/2907253.png'
        });
      }
    });

    // Check household
    householdItems.forEach(item => {
      if (item.quantity === 0) {
        new Notification('⚠️ 庫存告急', {
          body: `「${item.name}」已用完，請儘速補貨！`,
          icon: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png'
        });
      }
    });
  };

  // Run check periodically or on mount
  useEffect(() => {
    if (notificationPermission === 'granted') {
      checkAndNotify();
    }
  }, [notificationPermission]);

  // --- Computed Data ---
  const expiringToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return foodItems.filter(item => item.expiryDate === today);
  }, [foodItems]);

  const lowStockItems = useMemo(() => {
    const foodLow = foodItems.filter(item => item.quantity <= item.minQuantity);
    const houseLow = householdItems.filter(item => item.quantity <= item.minQuantity);
    return [...foodLow, ...houseLow];
  }, [foodItems, householdItems]);

  const shoppingListText = useMemo(() => {
    const date = new Date().toLocaleDateString('zh-TW');
    let text = `🛒 【全能智能管家 - 採買清單】\n日期：${date}\n\n`;
    
    if (lowStockItems.length > 0) {
      text += `⚠️ 庫存告急 (低於安全庫存)：\n`;
      lowStockItems.forEach((item, i) => {
        text += `${i + 1}. ${item.name} [${item.brand}] - $${item.price} (剩餘 ${item.quantity} ${item.unit})\n`;
      });
      text += `\n`;
    }

    if (expiringToday.length > 0) {
      text += `⏰ 今日需優先處理食材：\n`;
      expiringToday.forEach((item, i) => {
        text += `${i + 1}. ${item.name} [${item.brand}] - $${item.price} (今日到期)\n`;
      });
      text += `\n`;
    }

    text += `祝您生活愉快！✨`;
    return text;
  }, [lowStockItems, expiringToday]);

  // --- Handlers ---
  const addFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFood.name || !newFood.expiryDate) return;
    setFoodItems([...foodItems, { ...newFood, id: crypto.randomUUID() }]);
    setNewFood({ name: '', category: '蔬菜', brand: '', price: 0, quantity: 1, unit: '個', minQuantity: 1, expiryDate: '' });
    addToast(`已新增食材：${newFood.name}`);
  };

  const addHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouse.name) return;
    setHouseholdItems([...householdItems, { ...newHouse, id: crypto.randomUUID() }]);
    setNewHouse({ name: '', category: '清潔用品', brand: '', price: 0, quantity: 1, unit: '個', minQuantity: 1 });
    addToast(`已新增日用品：${newHouse.name}`);
  };

  const deleteFood = (id: string) => {
    const item = foodItems.find(i => i.id === id);
    setFoodItems(foodItems.filter(i => i.id !== id));
    if (item) addToast(`已刪除食材：${item.name}`, 'info');
  };

  const deleteHouse = (id: string) => {
    const item = householdItems.find(i => i.id === id);
    setHouseholdItems(householdItems.filter(i => i.id !== id));
    if (item) addToast(`已刪除日用品：${item.name}`, 'info');
  };

  const generateGoogleCalendarLink = (item: FoodItem) => {
    const date = item.expiryDate.replace(/-/g, '');
    const title = encodeURIComponent(`料理：${item.name} (${item.brand})`);
    const details = encodeURIComponent(`食材即將到期，請優先料理。價格：$${item.price}`);
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}`;
  };

  const handleCopy = () => {
    setCopying(true);
    navigator.clipboard.writeText(shoppingListText).then(() => {
      addToast('清單已複製到剪貼簿！');
      setTimeout(() => setCopying(false), 2000);
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '全能智能管家 - 採買清單',
          text: shoppingListText,
        });
        addToast('分享成功！');
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([shoppingListText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `採買清單_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addToast('清單已下載為文字檔！');
  };

  // --- Smart Recipe Logic ---
  const toggleFoodSelection = (id: string) => {
    setSelectedFoodIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const generateRecipe = async () => {
    if (selectedFoodIds.length === 0) {
      addToast('請先選擇至少一項食材！', 'error');
      return;
    }

    setIsGeneratingRecipe(true);
    setGeneratedRecipe(null);

    try {
      const selectedItems = foodItems
        .filter(item => selectedFoodIds.includes(item.id))
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

      const ingredientsList = selectedItems
        .map(item => `${item.name} (${item.brand}, 剩餘 ${item.quantity}${item.unit}, 到期日: ${item.expiryDate})`)
        .join('、');

      const prompt = `你是一位專業的五星級大廚與營養師。請根據以下即將到期的食材清單，設計一份美味、健康且易於製作的食譜。
      
      食材清單（已按到期日排序，請優先使用即將到期的食材）：
      ${ingredientsList}
      
      請提供繁體中文 (zh) 與 簡單易懂的英文 (Simple and Clear English) (en) 兩個版本的食譜。
      英文翻譯請確保簡單明瞭，適合大眾閱讀。
      每個版本都必須包含：
      1. 食譜名稱 (Title)
      2. 料理特色 (Features)
      3. 準備食材 (Ingredients)
      4. 烹飪步驟 (Steps)
      5. 營養價值分析 (Nutrition)
      6. 大廚小撇步 (Chef's Tips)
      
      請以 JSON 格式回傳，格式如下：
      {
        "zh": "繁體中文 Markdown 內容",
        "en": "Simple English Markdown content"
      }`;

      const ai = new GoogleGenAI({ apiKey: userApiKey || process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              zh: { type: Type.STRING },
              en: { type: Type.STRING }
            },
            required: ["zh", "en"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setGeneratedRecipe(result);
      addToast('智能食譜已生成！');
    } catch (error) {
      console.error('Recipe generation failed:', error);
      addToast('生成食譜時發生錯誤，請檢查網路或 API 設定。', 'error');
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 min-w-[200px] ${
                toast.type === 'success' ? 'bg-white border-green-100 text-green-800' :
                toast.type === 'info' ? 'bg-white border-blue-100 text-blue-800' :
                'bg-white border-rose-100 text-rose-800'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Info className="w-5 h-5 text-blue-500" />}
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-lg transition-colors duration-500">
              <ShoppingBag className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">全能智能管家</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className={`p-2 rounded-full transition-all ${showApiKeyInput ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-100'}`}
                title="設定 API Key"
              >
                <Key className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showApiKeyInput && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowApiKeyInput(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gemini API Key</span>
                          <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-brand-600 hover:underline font-bold"
                          >
                            獲取金鑰
                          </a>
                        </div>
                        <input 
                          type="password" 
                          placeholder="輸入您的 API Key..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                          value={userApiKey}
                          onChange={(e) => setUserApiKey(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 leading-tight">
                          您的 API Key 將儲存在本地瀏覽器中，僅用於生成食譜。
                        </p>
                        <button 
                          onClick={() => setShowApiKeyInput(false)}
                          className="w-full py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-all"
                        >
                          完成
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowThemePicker(!showThemePicker)}
                className={`p-2 rounded-full transition-all ${showThemePicker ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-100'}`}
                title="切換主題"
              >
                <Palette className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showThemePicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowThemePicker(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50"
                    >
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">選擇主題顏色</div>
                      <div className="grid grid-cols-1 gap-1">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setCurrentTheme(t.id);
                              setShowThemePicker(false);
                            }}
                            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all ${
                              currentTheme === t.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div 
                              className="w-4 h-4 rounded-full border border-white shadow-sm" 
                              style={{ backgroundColor: t.color }}
                            />
                            <span className="text-sm font-medium">{t.name}</span>
                            {currentTheme === t.id && <Check className="w-4 h-4 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setShowShareModal(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              title="分享清單"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={requestNotificationPermission}
              className={`p-2 rounded-full transition-colors ${notificationPermission === 'granted' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:bg-slate-100'}`}
              title="通知設定"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start gap-4"
          >
            <div className="bg-orange-100 p-3 rounded-xl">
              <Refrigerator className="text-orange-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-slate-500 text-sm font-medium">即將到期食材</h3>
              <p className="text-2xl font-bold mt-1">{expiringToday.length} 項</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start gap-4"
          >
            <div className="bg-rose-100 p-3 rounded-xl">
              <AlertTriangle className="text-rose-600 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-slate-500 text-sm font-medium">庫存告急</h3>
              <p className="text-2xl font-bold mt-1">{lowStockItems.length} 項</p>
            </div>
          </motion.div>
        </div>

        {/* Food Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Refrigerator className="w-5 h-5 text-brand-600" />
              <h2 className="font-bold text-lg">食材管理</h2>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <form onSubmit={addFood} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">名稱</label>
                <input 
                  type="text" 
                  placeholder="食材名稱" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newFood.name}
                  onChange={(e) => setNewFood({...newFood, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">種類</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all appearance-none"
                  value={newFood.category}
                  onChange={(e) => setNewFood({...newFood, category: e.target.value})}
                >
                  {CATEGORIES.food.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">品牌</label>
                <input 
                  type="text" 
                  placeholder="品牌名稱" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newFood.brand}
                  onChange={(e) => setNewFood({...newFood, brand: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">到期日</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newFood.expiryDate}
                  onChange={(e) => setNewFood({...newFood, expiryDate: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">價格</label>
                <input 
                  type="number" 
                  placeholder="價格" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newFood.price || ''}
                  onChange={(e) => setNewFood({...newFood, price: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">數量</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="0"
                    placeholder="數量" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    value={newFood.quantity || ''}
                    onChange={(e) => setNewFood({...newFood, quantity: parseInt(e.target.value) || 0})}
                  />
                  <input 
                    type="text" 
                    placeholder="單位" 
                    className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    value={newFood.unit}
                    onChange={(e) => setNewFood({...newFood, unit: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">安全庫存</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="低於此數提醒" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newFood.minQuantity || ''}
                  onChange={(e) => setNewFood({...newFood, minQuantity: parseInt(e.target.value) || 0})}
                />
              </div>
              <button type="submit" className="md:col-span-3 bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-100">
                <Plus className="w-5 h-5" /> 新增食材
              </button>
            </form>

            <div className="grid grid-cols-1 gap-3">
              {foodItems.map(item => (
                <ItemRow key={item.id} item={item} onDelete={deleteFood} onCalendar={generateGoogleCalendarLink} />
              ))}
            </div>
          </div>
        </section>

        {/* Smart Recipe Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <ChefHat className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-lg">智能食譜生成</h2>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">選擇食材 (將優先使用快過期的項目)：</p>
                <span className="text-xs text-slate-400">已選擇 {selectedFoodIds.length} 項</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {foodItems.map(item => {
                  const isSelected = selectedFoodIds.includes(item.id);
                  const isExpiring = item.expiryDate === new Date().toISOString().split('T')[0];
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleFoodSelection(item.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        isSelected 
                          ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-100' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {item.name}
                      {isExpiring && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />}
                    </button>
                  );
                })}
                {foodItems.length === 0 && (
                  <p className="text-xs text-slate-400 italic py-2">目前沒有食材可供選擇</p>
                )}
              </div>
            </div>

            <button
              onClick={generateRecipe}
              disabled={isGeneratingRecipe || selectedFoodIds.length === 0}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                isGeneratingRecipe || selectedFoodIds.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-600 to-violet-600 text-white hover:from-brand-700 hover:to-violet-700 shadow-brand-100'
              }`}
            >
              {isGeneratingRecipe ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在構思美味食譜...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  生成智能食譜
                </>
              )}
            </button>

            <AnimatePresence>
              {generatedRecipe && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-6"
                >
                  {/* Side-by-Side Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chinese Version */}
                    <div className="p-6 bg-white rounded-2xl border border-slate-200 relative shadow-sm">
                      <div className="absolute top-4 right-4 text-brand-100">
                        <span className="text-4xl font-black opacity-20">ZH</span>
                      </div>
                      <div className="prose prose-slate prose-sm max-w-none prose-headings:text-brand-900 prose-strong:text-brand-700 prose-ul:list-disc relative z-10">
                        <ReactMarkdown>{generatedRecipe.zh}</ReactMarkdown>
                      </div>
                    </div>

                    {/* English Version */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 relative shadow-sm">
                      <div className="absolute top-4 right-4 text-brand-100">
                        <span className="text-4xl font-black opacity-20">EN</span>
                      </div>
                      <div className="prose prose-slate prose-sm max-w-none prose-headings:text-brand-900 prose-strong:text-brand-700 prose-ul:list-disc relative z-10">
                        <ReactMarkdown>{generatedRecipe.en}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Household Management */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-600" />
              <h2 className="font-bold text-lg">日用品庫存</h2>
            </div>
            {(lowStockItems.length > 0 || expiringToday.length > 0) && (
              <button 
                onClick={() => setShowShareModal(true)}
                className="text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" /> 匯出採買清單
              </button>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <form onSubmit={addHousehold} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">名稱</label>
                <input 
                  type="text" 
                  placeholder="物品名稱" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newHouse.name}
                  onChange={(e) => setNewHouse({...newHouse, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">種類</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all appearance-none"
                  value={newHouse.category}
                  onChange={(e) => setNewHouse({...newHouse, category: e.target.value})}
                >
                  {CATEGORIES.household.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">品牌</label>
                <input 
                  type="text" 
                  placeholder="品牌名稱" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newHouse.brand}
                  onChange={(e) => setNewHouse({...newHouse, brand: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">價格</label>
                <input 
                  type="number" 
                  placeholder="價格" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newHouse.price || ''}
                  onChange={(e) => setNewHouse({...newHouse, price: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">數量</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="0"
                    placeholder="數量" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    value={newHouse.quantity || ''}
                    onChange={(e) => setNewHouse({...newHouse, quantity: parseInt(e.target.value) || 0})}
                  />
                  <input 
                    type="text" 
                    placeholder="單位" 
                    className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    value={newHouse.unit}
                    onChange={(e) => setNewHouse({...newHouse, unit: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">安全庫存</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="低於此數提醒" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  value={newHouse.minQuantity || ''}
                  onChange={(e) => setNewHouse({...newHouse, minQuantity: parseInt(e.target.value) || 0})}
                />
              </div>
              <button type="submit" className="md:col-span-3 bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-100">
                <Plus className="w-5 h-5" /> 新增日用品
              </button>
            </form>

            <div className="grid grid-cols-1 gap-3">
              {householdItems.map(item => (
                <ItemRow key={item.id} item={item} onDelete={deleteHouse} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Daily Briefing Modal */}
      <AnimatePresence>
        {showBriefing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBriefing(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-brand-600 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-brand-400/20 rounded-full blur-2xl" />
                
                <button 
                  onClick={() => setShowBriefing(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
 
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                    <Bell className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">每日晨報</h2>
                </div>
                <p className="text-brand-100 text-lg leading-relaxed">
                  早安！今天為您彙總了家居狀態：
                </p>
              </div>
 
              <div className="p-8 space-y-6">
                <div className="flex gap-4">
                  <div className="bg-orange-50 p-3 rounded-2xl h-fit">
                    <Refrigerator className="text-orange-600 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">食材提醒</h4>
                    <p className="text-slate-600 text-sm mt-1">
                      您有 <span className="font-bold text-orange-600">{expiringToday.length}</span> 項食材
                      （{expiringToday.map(i => i.name).join('、') || '無'}）今天到期，建議今晚優先料理。
                    </p>
                  </div>
                </div>
 
                <div className="flex gap-4">
                  <div className="bg-rose-50 p-3 rounded-2xl h-fit">
                    <ShoppingBag className="text-rose-600 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">庫存預警</h4>
                    <p className="text-slate-600 text-sm mt-1">
                      有 <span className="font-bold text-rose-600">{lowStockItems.length}</span> 項物品
                      （{lowStockItems.map(i => i.name).join('、') || '無'}）庫存低於安全水位，已為您列入購物清單。
                    </p>
                  </div>
                </div>
 
                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setShowBriefing(false);
                      setShowShareModal(true);
                    }}
                    className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" /> 查看採買清單
                  </button>
                  <button 
                    onClick={() => setShowBriefing(false)}
                    className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-semibold hover:bg-slate-200 transition-all"
                  >
                    我知道了
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-brand-600" />
                  <h2 className="font-bold text-lg">匯出採買清單</h2>
                </div>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
 
              <div className="p-6 overflow-y-auto flex-1">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-sm whitespace-pre-wrap text-slate-700 leading-relaxed">
                  {shoppingListText}
                </div>
              </div>
 
              <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button 
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl hover:border-brand-500 hover:text-brand-600 transition-all group"
                >
                  <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-brand-50 transition-colors">
                    {copying ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-bold">{copying ? '已複製' : '複製內容'}</span>
                </button>
 
                <button 
                  onClick={handleShare}
                  className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl hover:border-brand-500 hover:text-brand-600 transition-all group"
                >
                  <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-brand-50 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">系統分享</span>
                </button>
 
                <button 
                  onClick={handleDownload}
                  className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl hover:border-brand-500 hover:text-brand-600 transition-all group col-span-2 sm:col-span-1"
                >
                  <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-brand-50 transition-colors">
                    <Download className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">下載文字檔</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* Floating Action Hint */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-3 max-w-xs animate-bounce">
          <div className="bg-brand-100 p-2 rounded-lg">
            <Info className="text-brand-600 w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-600">
            點擊右上角 <Bell className="inline w-3 h-3" /> 開啟系統通知，獲取即時警報！
          </p>
        </div>
      </div>
    </div>
  );
}
