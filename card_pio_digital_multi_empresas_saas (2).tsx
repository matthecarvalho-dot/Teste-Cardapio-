import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  ShoppingCart, Plus, Minus, Trash2, Edit, Settings, 
  Search, X, ChevronRight, Store, MapPin, Clock, 
  DollarSign, Package, List, Share2, 
  Eye, ArrowRight, RefreshCw, Send, CheckCircle2,
  Upload, BarChart3, Truck, CheckSquare, Ban,
  ToggleLeft, ToggleRight, LayoutDashboard,
  Calendar, Copy, Building2, ShieldCheck, Phone
} from 'lucide-react';

// ==========================================
// FIREBASE INITIALIZATION & SAFE FALLBACK
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "demo-api-key",
      authDomain: "demo-project.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo-project.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:123456"
    };

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase Init Warning:", e);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'delivery-saas-app';

// Helper: Formatação de Moeda BRL
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper: Limpeza de Número de WhatsApp
const cleanPhoneNumber = (phone) => {
  if (!phone) return '5511999998888';
  return phone.replace(/\D/g, '');
};

// Definição de Status para o Kanban
const ORDER_STATUSES = [
  { key: 'pending', label: 'Pendente', color: 'bg-amber-500' },
  { key: 'preparing', label: 'Em Preparo', color: 'bg-blue-500' },
  { key: 'delivering', label: 'Saiu p/ Entrega', color: 'bg-purple-500' },
  { key: 'completed', label: 'Concluído', color: 'bg-emerald-500' },
  { key: 'cancelled', label: 'Cancelado', color: 'bg-red-500' }
];

// LOJAS INICIAIS
const INITIAL_STORES = [
  {
    id: 'bella-pizza',
    name: "Bella Pizza & Burger",
    whatsapp: "5511999998888",
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
    openingHours: "Ter - Dom: 18h às 23h30",
    deliveryFee: 7.00,
    ownerEmail: "pizzaria@empresa.com",
    coverImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    logoImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80",
    description: "Pizzas artesanais no forno a lenha, hambúrgueres gourmet e sobremesas deliciosas!"
  },
  {
    id: 'sushi-express',
    name: "Sushi Express & Temakeria",
    whatsapp: "5511988887777",
    address: "Rua Augusta, 500 - Consolação, São Paulo - SP",
    openingHours: "Qua - Seg: 12h às 22h",
    deliveryFee: 9.00,
    ownerEmail: "sushi@empresa.com",
    coverImage: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    logoImage: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=200&q=80",
    description: "Culinária japonesa fresca, combinados e temakis artesanais."
  }
];

// CATEGORIAS INICIAIS
const INITIAL_CATEGORIES = [
  { id: 'cat-1', storeId: 'bella-pizza', name: '🔥 Mais Pedidos', order: 1, isScheduled: false },
  { id: 'cat-2', storeId: 'bella-pizza', name: '🍕 Pizzas Artesanais', order: 2, isScheduled: false },
  { id: 'cat-3', storeId: 'bella-pizza', name: '🍔 Hambúrgueres', order: 3, isScheduled: false },
  { id: 'cat-4', storeId: 'bella-pizza', name: '🍰 Sobremesas', order: 4, isScheduled: false },
  { id: 'cat-5', storeId: 'bella-pizza', name: '🥤 Bebidas', order: 5, isScheduled: false },
  { id: 'cat-6', storeId: 'bella-pizza', name: '📅 Encomendas Agendadas', order: 6, isScheduled: true }
];

// PRODUTOS INICIAIS (CATÁLOGO COMPLETO: TOP 10 PIZZAS, BEBIDAS, HAMBÚRGUERES, SOBREMESAS)
const INITIAL_PRODUCTS = [
  // --- TOP 10 PIZZAS ---
  {
    id: 'p1',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Calabresa Especial',
    description: 'Molho artesanal, muçarela, fatias de calabresa defumada, cebola roxa e azeitonas pretas.',
    price: 48.90,
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    available: true,
    badge: '🔥 nº 1 no Brasil'
  },
  {
    id: 'p2',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Muçarela Tradicional',
    description: 'Queijo muçarela derretido de alta qualidade, rodelas de tomate fresco e orégano.',
    price: 45.90,
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    available: true,
    badge: 'Mais Pedido'
  },
  {
    id: 'p3',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Portuguesa Tradicional',
    description: 'Presunto cozido, muçarela, ovos selecionados, cebola, ervilhas, azeitonas e azeite extravirgem.',
    price: 52.90,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'p4',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Marguerita Especial',
    description: 'Molho de tomate italiano, muçarela, rodelas de tomate, manjericão fresco e azeite.',
    price: 49.90,
    imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'p5',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Frango com Catupiry',
    description: 'Frango desfiado bem temperado coberto com o legítimo Catupiry original.',
    price: 54.90,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    available: true,
    badge: 'Destaque'
  },
  {
    id: 'p6',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Quatro Queijos Gourmet',
    description: 'Combinação perfeita de Muçarela, Provolone, Gorgonzola cremoso e Catupiry.',
    price: 56.90,
    imageUrl: 'https://images.unsplash.com/photo-1573821663912-569905455b1c?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'p7',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Napolitana',
    description: 'Molho de tomate, muçarela, rodelas de tomate fresco, queijo parmesão ralado e orégano.',
    price: 47.90,
    imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'p8',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Lombo Canadense',
    description: 'Fatias selecionadas de lombo canadense, muçarela suave, cebola e catupiry cremoso.',
    price: 53.90,
    imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'p9',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Pepperoni Supreme',
    description: 'Molho especial, muçarela gratinada e fatias crocantes de pepperoni de primeira qualidade.',
    price: 55.90,
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'p10',
    storeId: 'bella-pizza',
    categoryId: 'cat-2',
    name: 'Pizza Doce Brigadeiro Gourmet',
    description: 'Massa fina coberta com cremoso brigadeiro artesanal e confeitos de chocolate ao leite.',
    price: 46.90,
    imageUrl: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=800&q=80',
    available: true,
    badge: 'Doce'
  },

  // --- HAMBÚRGUERES ---
  {
    id: 'h1',
    storeId: 'bella-pizza',
    categoryId: 'cat-3',
    name: 'Smash Burger Duplo',
    description: 'Dois hambúrgueres smash (80g cada), queijo cheddar duplo, maionese da casa e pão brioche.',
    price: 32.90,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    available: true,
    badge: 'Mais Pedido'
  },
  {
    id: 'h2',
    storeId: 'bella-pizza',
    categoryId: 'cat-3',
    name: 'Bacon Cheese Blast',
    description: 'Hambúrguer artesanal de 180g, muito bacon crocante, cheddar inglês e molho barbecue.',
    price: 38.90,
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'h3',
    storeId: 'bella-pizza',
    categoryId: 'cat-3',
    name: 'Chicken Crispy Creamy',
    description: 'Sobrecoxa empanada super crocante, alface americana, tomate e maionese temperada.',
    price: 29.90,
    imageUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80',
    available: true
  },

  // --- SOBREMESAS ---
  {
    id: 's1',
    storeId: 'bella-pizza',
    categoryId: 'cat-4',
    name: 'Petit Gâteau Supremo',
    description: 'Bolo quente de chocolate belga com recheio cremoso e bola de sorvete de baunilha.',
    price: 24.90,
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
    available: true,
    badge: 'Mais Pedido'
  },
  {
    id: 's2',
    storeId: 'bella-pizza',
    categoryId: 'cat-4',
    name: 'Pudim Caseiro de Leite',
    description: 'Pudim super cremoso sem furinhos com calda de caramelo caseira.',
    price: 14.90,
    imageUrl: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?auto=format&fit=crop&w=800&q=80',
    available: true
  },

  // --- TOP 9 BEBIDAS ---
  {
    id: 'b1',
    storeId: 'bella-pizza',
    categoryId: 'cat-5',
    name: 'Coca-Cola 2L',
    description: 'Garrafa de 2 litros gelada.',
    price: 14.00,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    available: true,
    badge: 'Líder de Vendas'
  },
  {
    id: 'b2',
    storeId: 'bella-pizza',
    categoryId: 'cat-5',
    name: 'Guaraná Antarctica 2L',
    description: 'Garrafa de 2 litros bem gelada.',
    price: 12.00,
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'b3',
    storeId: 'bella-pizza',
    categoryId: 'cat-5',
    name: 'Cerveja Long Neck Premium (330ml)',
    description: 'Cerveja Pilsen/Lager geladíssima.',
    price: 9.90,
    imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'b4',
    storeId: 'bella-pizza',
    categoryId: 'cat-5',
    name: 'Suco de Uva Integral (500ml)',
    description: 'Suco de uva 100% natural e sem adição de açúcares, ideal para harmonização.',
    price: 12.90,
    imageUrl: 'https://images.unsplash.com/photo-1533561797500-4fad87532e1d?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'b5',
    storeId: 'bella-pizza',
    categoryId: 'cat-5',
    name: 'Chopp Claro Gelado (500ml)',
    description: 'Chopp Pilsen artesanal com colarinho cremoso em copo térmico descartável.',
    price: 11.90,
    imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'b6',
    storeId: 'bella-pizza',
    categoryId: 'cat-5',
    name: 'Água Mineral com Gás (500ml)',
    description: 'Garrafa 500ml bem gelada.',
    price: 4.50,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'b7',
    storeId: 'bella-pizza',
    categoryId: 'cat-5',
    name: 'Chá Gelado Ice Tea Limão (500ml)',
    description: 'Chá preto gelado com toque refrescante de limão.',
    price: 7.90,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
    available: true
  },
  {
    id: 'b8',
    storeId: 'bella-pizza',
    categoryId: 'cat-5',
    name: 'Vinho Tinto Seco Fino (750ml)',
    description: 'Vinho tinto selecionado perfeito para harmonizar com pizzas de queijos e carnes.',
    price: 59.90,
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
    available: true
  },

  // --- ENCOMENDAS AGENDADAS ---
  {
    id: 'enc-1',
    storeId: 'bella-pizza',
    categoryId: 'cat-6',
    name: 'Cesta de Festa Especial (Sob Encomenda)',
    description: 'Encomenda agendada: 2 Pizzas Grandes, 10 Mini Burguers, 2 Refrigerantes 2L e 1 Torta Doce.',
    price: 149.90,
    imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
    available: true,
    badge: 'Encomenda Agendada'
  }
];

export default function App() {
  const [user, setUser] = useState(null);

  // Modos de Navegação
  const [viewMode, setViewMode] = useState('customer'); // 'customer' | 'owner' | 'master'
  const [ownerSection, setOwnerSection] = useState('kanban'); // 'kanban' | 'analytics' | 'products' | 'categories' | 'store'

  // Estados com fallback direto para garantir funcionamento 100%
  const [stores, setStores] = useState(INITIAL_STORES);
  const [currentStoreId, setCurrentStoreId] = useState('bella-pizza');
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [ordersHistory, setOrdersHistory] = useState([
    {
      id: 'ord-1001',
      orderNumber: 1001,
      storeId: 'bella-pizza',
      customerName: 'Carlos Eduardo',
      customerPhone: '11999887766',
      deliveryType: 'delivery',
      address: 'Rua das Flores, 123 - Centro',
      paymentMethod: 'pix',
      total: 62.90,
      status: 'pending',
      items: [
        { quantity: 1, name: 'Pizza Calabresa Especial', price: 48.90 }
      ],
      createdAt: new Date().toISOString()
    }
  ]);

  // Estado do Cardápio do Cliente
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productNote, setProductNote] = useState('');

  // Carrinho e Checkout
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [checkoutData, setCheckoutData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryType: 'delivery',
    addressStreet: '',
    addressNumber: '',
    addressNeighborhood: '',
    paymentMethod: 'pix',
    cashChange: '',
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: ''
  });

  // Formulários de Edição
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: '',
    id: '',
    whatsapp: '',
    address: '',
    deliveryFee: 5.00,
    openingHours: '',
    logoImage: '',
    coverImage: '',
    description: '',
    ownerEmail: ''
  });

  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    badge: '',
    available: true
  });

  const [editingCategory, setEditingCategory] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', order: 1, isScheduled: false });

  // Notificações Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Suporte a parâmetro de URL ex: ?store=sushi-express
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storeParam = params.get('store');
    if (storeParam) {
      setCurrentStoreId(storeParam);
    }
  }, []);

  // Inicialização do Firebase Auth & Firestore Sync
  useEffect(() => {
    if (!auth || !db) return;

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Auth warning:", err);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });

    return () => unsubscribe();
  }, []);

  // Sync de dados Firestore em Tempo Real com proteção de Fallback
  useEffect(() => {
    if (!db) return;

    try {
      // 1. Sincronização de Lojas
      const storesCol = collection(db, 'artifacts', appId, 'public', 'data', 'stores');
      const unsubStores = onSnapshot(storesCol, (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setStores(items);
        }
      }, (err) => console.warn("Stores sync warning:", err));

      // 2. Sincronização de Categorias
      const categoriesCol = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
      const unsubCats = onSnapshot(categoriesCol, (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          items.sort((a, b) => (a.order || 0) - (b.order || 0));
          setCategories(items);
        }
      }, (err) => console.warn("Categories sync warning:", err));

      // 3. Sincronização de Produtos
      const productsCol = collection(db, 'artifacts', appId, 'public', 'data', 'products');
      const unsubProds = onSnapshot(productsCol, (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setProducts(items);
        }
      }, (err) => console.warn("Products sync warning:", err));

      // 4. Sincronização de Pedidos
      const ordersCol = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
      const unsubOrders = onSnapshot(ordersCol, (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          setOrdersHistory(items);
        }
      }, (err) => console.warn("Orders sync warning:", err));

      return () => {
        unsubStores();
        unsubCats();
        unsubProds();
        unsubOrders();
      };
    } catch (e) {
      console.warn("Firestore sync bypassed:", e);
    }
  }, [user]);

  // Contexto da Loja Atual
  const currentStore = useMemo(() => {
    return stores.find(s => s.id === currentStoreId) || stores[0] || INITIAL_STORES[0];
  }, [stores, currentStoreId]);

  const storeCategories = useMemo(() => {
    return categories.filter(c => c.storeId === currentStore.id);
  }, [categories, currentStore]);

  const storeProducts = useMemo(() => {
    return products.filter(p => p.storeId === currentStore.id);
  }, [products, currentStore]);

  const storeOrders = useMemo(() => {
    return ordersHistory.filter(o => o.storeId === currentStore.id);
  }, [ordersHistory, currentStore]);

  // Produtos filtrados no cardápio
  const filteredProducts = useMemo(() => {
    return storeProducts.filter(p => {
      const matchesCategory = selectedCategory === 'all'
        ? true
        : selectedCategory === 'cat-1'
        ? (p.badge || p.id.startsWith('p1') || p.id.startsWith('h1'))
        : p.categoryId === selectedCategory;

      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [storeProducts, selectedCategory, searchQuery]);

  // Verifica se há itens agendados no carrinho
  const cartHasScheduledItems = useMemo(() => {
    return cart.some(item => {
      const cat = categories.find(c => c.id === item.categoryId);
      return cat?.isScheduled;
    });
  }, [cart, categories]);

  // Upload de imagem local (Base64) com suporte a PNG transparente
  const handleImageFileUpload = (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      showToast("Selecione uma imagem de até 4MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
      showToast("Imagem carregada!");
    };
    reader.readAsDataURL(file);
  };

  // Funções do Carrinho
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const cartItem = {
      cartId: `${selectedProduct.id}-${Date.now()}`,
      productId: selectedProduct.id,
      categoryId: selectedProduct.categoryId,
      name: selectedProduct.name,
      price: Number(selectedProduct.price),
      quantity: productQuantity,
      note: productNote.trim(),
      imageUrl: selectedProduct.imageUrl
    };

    setCart(prev => [...prev, cartItem]);
    setSelectedProduct(null);
    setProductQuantity(1);
    setProductNote('');
    showToast(`"${cartItem.name}" adicionado ao carrinho!`);
  };

  const updateCartQuantity = (cartId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const deliveryFee = checkoutData.deliveryType === 'delivery' ? Number(currentStore.deliveryFee || 0) : 0;
  const cartTotal = cartSubtotal + deliveryFee;

  // Copiar link exclusivo da loja
  const copyStoreLink = async (storeId) => {
    const storeUrl = `${window.location.origin}${window.location.pathname}?store=${storeId}`;
    let copied = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(storeUrl);
        copied = true;
      } catch (err) {
        console.warn('Clipboard API blocked:', err);
      }
    }

    if (!copied) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = storeUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.warn('execCommand failed:', err);
      }
    }

    if (copied) {
      showToast(`Link exclusivo da loja copiado!`);
    } else {
      window.prompt('Copie o link exclusivo da loja abaixo:', storeUrl);
    }
  };

  // Envio do Pedido via WhatsApp
  const handleSendWhatsAppOrder = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast("Seu carrinho está vazio!", "error");
      return;
    }

    if (!checkoutData.customerName || !checkoutData.customerPhone) {
      showToast("Preencha seu nome e telefone de contato.", "error");
      return;
    }

    if (checkoutData.deliveryType === 'delivery' && (!checkoutData.addressStreet || !checkoutData.addressNeighborhood)) {
      showToast("Preencha o endereço completo para entrega.", "error");
      return;
    }

    if ((checkoutData.isScheduled || cartHasScheduledItems) && (!checkoutData.scheduledDate || !checkoutData.scheduledTime)) {
      showToast("Defina a Data e o Horário da Encomenda Agendada.", "error");
      return;
    }

    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();

    let msg = `*🍕 NOVO PEDIDO #${orderNumber}*\n`;
    msg += `🏢 *${currentStore.name.toUpperCase()}*\n`;
    msg += `-------------------------------------------\n`;
    msg += `👤 *Cliente:* ${checkoutData.customerName}\n`;
    msg += `📞 *Telefone:* ${checkoutData.customerPhone}\n`;
    msg += `🛵 *Tipo:* ${checkoutData.deliveryType === 'delivery' ? 'Entrega em Domicílio' : 'Retirada no Balcão'}\n`;

    if (checkoutData.isScheduled || cartHasScheduledItems) {
      msg += `📅 *ENCOMENDA AGENDADA:* Sim\n`;
      msg += `📆 *Data da Entrega:* ${checkoutData.scheduledDate}\n`;
      msg += `⏰ *Horário Agendado:* ${checkoutData.scheduledTime}\n`;
    }

    if (checkoutData.deliveryType === 'delivery') {
      msg += `🏠 *Endereço:* ${checkoutData.addressStreet}, Nº ${checkoutData.addressNumber || 'S/N'}\n`;
      msg += `🏙️ *Bairro:* ${checkoutData.addressNeighborhood}\n`;
    }

    msg += `-------------------------------------------\n`;
    msg += `🛒 *ITENS DO PEDIDO:*\n\n`;

    cart.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.quantity}x ${item.name}* - ${formatCurrency(item.price * item.quantity)}\n`;
      if (item.note) msg += `   └ 📝 *Obs:* _${item.note}_\n`;
    });

    msg += `\n-------------------------------------------\n`;
    msg += `💵 *Subtotal:* ${formatCurrency(cartSubtotal)}\n`;
    msg += `🛵 *Taxa de Entrega:* ${checkoutData.deliveryType === 'delivery' ? formatCurrency(deliveryFee) : 'Grátis'}\n`;
    msg += `💰 *TOTAL DO PEDIDO:* *${formatCurrency(cartTotal)}*\n`;
    msg += `-------------------------------------------\n`;

    let payText = 'PIX';
    if (checkoutData.paymentMethod === 'card') payText = 'Cartão de Débito/Crédito';
    if (checkoutData.paymentMethod === 'cash') payText = `Dinheiro (Troco para R$ ${checkoutData.cashChange || 'Não precisa'})`;

    msg += `💳 *Forma de Pagamento:* ${payText}\n`;
    msg += `-------------------------------------------\n`;
    msg += `_Pedido enviado via Cardápio Digital_ 🚀`;

    const newOrderPayload = {
      id: `ord-${orderNumber}`,
      orderNumber,
      storeId: currentStore.id,
      customerName: checkoutData.customerName,
      customerPhone: checkoutData.customerPhone,
      deliveryType: checkoutData.deliveryType,
      address: checkoutData.deliveryType === 'delivery' 
        ? `${checkoutData.addressStreet}, ${checkoutData.addressNumber} - ${checkoutData.addressNeighborhood}`
        : 'Retirada no Balcão',
      paymentMethod: checkoutData.paymentMethod,
      total: cartTotal,
      items: cart,
      isScheduled: checkoutData.isScheduled || cartHasScheduledItems,
      scheduledDate: checkoutData.scheduledDate || '',
      scheduledTime: checkoutData.scheduledTime || '',
      status: 'pending',
      createdAt: now.toISOString()
    };

    // Atualiza histórico local
    setOrdersHistory(prev => [newOrderPayload, ...prev]);

    // Salva no Firestore se disponível
    if (db) {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrderPayload);
      } catch (err) {
        console.warn("Firestore save bypass:", err);
      }
    }

    const waPhone = cleanPhoneNumber(currentStore.whatsapp);
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;

    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);

    window.open(waUrl, '_blank');
    showToast("Redirecionando para o WhatsApp...", "success");
  };

  // Alternar disponibilidade rápida
  const toggleProductAvailability = async (product) => {
    const updatedStatus = !product.available;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, available: updatedStatus } : p));

    if (db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id);
        await updateDoc(docRef, { available: updatedStatus });
      } catch (err) {
        console.warn("Firestore sync bypass:", err);
      }
    }
    showToast(`"${product.name}" alterado para ${updatedStatus ? 'Disponível' : 'Esgotado'}.`);
  };

  // Atualizar Status do Pedido no Kanban
  const updateOrderStatus = async (orderId, newStatus) => {
    setOrdersHistory(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    if (db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
        await updateDoc(docRef, { status: newStatus });
      } catch (err) {
        console.warn("Firestore sync bypass:", err);
      }
    }
    showToast("Status atualizado no Kanban!");
  };

  // Cadastro e Edição de Empresa
  const openStoreEditor = (st = null) => {
    if (st) {
      setStoreForm({ ...st });
    } else {
      setStoreForm({
        name: '',
        id: `empresa-${Date.now().toString().slice(-4)}`,
        whatsapp: '5511999998888',
        address: '',
        deliveryFee: 5.00,
        openingHours: '18h às 23h30',
        logoImage: '',
        coverImage: '',
        description: '',
        ownerEmail: ''
      });
    }
    setIsStoreModalOpen(true);
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!storeForm.name || !storeForm.id || !storeForm.whatsapp) {
      showToast("Preencha Nome, ID e WhatsApp.", "error");
      return;
    }

    setStores(prev => {
      const exists = prev.some(s => s.id === storeForm.id);
      if (exists) return prev.map(s => s.id === storeForm.id ? { ...storeForm } : s);
      return [...prev, { ...storeForm }];
    });

    if (db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'stores', storeForm.id);
        await setDoc(docRef, storeForm, { merge: true });
      } catch (err) {
        console.warn("Firestore sync bypass:", err);
      }
    }

    showToast("Dados da empresa salvos com sucesso!");
    setIsStoreModalOpen(false);
  };

  // CRUD de Produtos
  const openProductEditor = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({ ...prod });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        categoryId: storeCategories[0]?.id || 'cat-2',
        imageUrl: '',
        badge: '',
        available: true
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.categoryId) {
      showToast("Preencha Nome, Preço e Categoria.", "error");
      return;
    }

    const payload = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      storeId: currentStore.id,
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price),
      categoryId: productForm.categoryId,
      imageUrl: productForm.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      badge: productForm.badge,
      available: productForm.available
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? payload : p));
    } else {
      setProducts(prev => [...prev, payload]);
    }

    if (db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', payload.id);
        await setDoc(docRef, payload, { merge: true });
      } catch (err) {
        console.warn("Firestore sync bypass:", err);
      }
    }

    showToast(editingProduct ? "Produto alterado!" : "Produto cadastrado!");
    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = async (prodId) => {
    if (!window.confirm("Excluir este produto do cardápio?")) return;
    setProducts(prev => prev.filter(p => p.id !== prodId));

    if (db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', prodId));
      } catch (err) {
        console.warn("Firestore delete bypass:", err);
      }
    }
    showToast("Produto removido.");
  };

  // CRUD de Categorias
  const openCategoryEditor = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, order: cat.order || 1, isScheduled: !!cat.isScheduled });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', order: storeCategories.length + 1, isScheduled: false });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name) {
      showToast("Informe o nome da categoria.", "error");
      return;
    }

    const payload = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      storeId: currentStore.id,
      name: categoryForm.name,
      order: Number(categoryForm.order),
      isScheduled: categoryForm.isScheduled
    };

    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? payload : c));
    } else {
      setCategories(prev => [...prev, payload]);
    }

    if (db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'categories', payload.id);
        await setDoc(docRef, payload, { merge: true });
      } catch (err) {
        console.warn("Firestore category bypass:", err);
      }
    }

    showToast("Categoria salva com sucesso!");
    setIsCategoryModalOpen(false);
  };

  // Métricas de Vendas
  const analyticsMetrics = useMemo(() => {
    const validOrders = storeOrders.filter(o => o.status !== 'cancelled');
    const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalOrdersCount = validOrders.length;
    const averageTicket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = validOrders.filter(o => o.createdAt?.startsWith(todayStr));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    return {
      totalRevenue,
      totalOrdersCount,
      averageTicket,
      todayRevenue
    };
  }, [storeOrders]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      
      {/* Toast de Notificação */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl transition-all duration-300 animate-bounce ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
        }`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* CABEÇALHO PRINCIPAL E SELEÇÃO DE MODOS */}
      <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-red-500" />
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-white hidden sm:inline">SaaS Delivery</span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              
              <select
                value={currentStoreId}
                onChange={(e) => setCurrentStoreId(e.target.value)}
                className="bg-slate-800 text-white text-xs sm:text-sm font-bold py-1.5 px-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
              <button
                onClick={() => setViewMode('customer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'customer' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Cardápio Cliente</span>
              </button>

              <button
                onClick={() => setViewMode('owner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'owner' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Painel Empresário</span>
              </button>

              <button
                onClick={() => setViewMode('master')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'master' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Master Admin</span>
              </button>
            </div>

            <button
              onClick={() => copyStoreLink(currentStore.id)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 transition"
              title="Copiar Link Exclusivo do Cardápio"
            >
              <Copy className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

        </div>
      </header>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 max-w-7xl w-full mx-auto pb-24">

        {/* ========================================================= */}
        {/* VISÃO 1: CARDÁPIO DIGITAL DO CLIENTE                    */}
        {/* ========================================================= */}
        {viewMode === 'customer' && (
          <div>
            <div className="relative bg-slate-900 text-white overflow-hidden shadow-lg mb-6">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-xs"
                style={{ backgroundImage: `url(${currentStore.coverImage})` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent"></div>

              <div className="relative max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center sm:items-end gap-5">
                <img 
                  src={currentStore.logoImage} 
                  alt={currentStore.name} 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-slate-800 shadow-2xl bg-slate-800 shrink-0"
                />
                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{currentStore.name}</h1>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                      ● Aberto Agora
                    </span>
                  </div>

                  <p className="text-slate-300 text-sm max-w-2xl line-clamp-2">{currentStore.description}</p>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-red-400" />
                      {currentStore.openingHours}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      {currentStore.address}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-400">
                      <DollarSign className="w-3.5 h-3.5" />
                      Entrega: {formatCurrency(currentStore.deliveryFee)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => copyStoreLink(currentStore.id)}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Compartilhar Link</span>
                </button>
              </div>
            </div>

            {/* Barra de Busca e Filtro de Categorias */}
            <div className="sticky top-[53px] z-30 bg-slate-50/95 backdrop-blur-md py-3 px-4 border-b border-slate-200 shadow-xs">
              <div className="max-w-7xl mx-auto space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar pizzas, hambúrgueres, bebidas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === 'all'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Todos os Itens
                  </button>

                  {storeCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                        selectedCategory === cat.id
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat.isScheduled && <Calendar className="w-3.5 h-3.5 text-amber-300" />}
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid de Produtos */}
            <div className="px-4 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => product.available && setSelectedProduct(product)}
                    className={`bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex gap-3 sm:gap-4 transition hover:shadow-lg cursor-pointer relative overflow-hidden group ${
                      !product.available ? 'opacity-60 grayscale cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                      />
                      {product.badge && (
                        <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                          {product.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-red-600 transition">
                          {product.name}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1 line-clamp-2">{product.description}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="font-black text-slate-900 text-base">{formatCurrency(product.price)}</span>
                        {product.available ? (
                          <button className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-xl transition font-semibold text-xs flex items-center gap-1">
                            <Plus className="w-4 h-4" />
                            <span>Adicionar</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Esgotado</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Barra Flutuante do Carrinho */}
            {cart.length > 0 && (
              <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40">
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between transition border border-red-500/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl relative">
                      <ShoppingCart className="w-6 h-6 text-white" />
                      <span className="absolute -top-1.5 -right-1.5 bg-white text-red-600 font-extrabold text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-red-100">Ver Carrinho ({currentStore.name})</div>
                      <div className="text-base font-black">{formatCurrency(cartTotal)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-sm bg-white/15 px-3 py-1.5 rounded-xl">
                    Avançar
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VISÃO 2: PAINEL DO EMPRESÁRIO                            */}
        {/* ========================================================= */}
        {viewMode === 'owner' && (
          <div className="px-4 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Painel do Proprietário: {currentStore.name}</h2>
                <p className="text-xs text-slate-500">Gerencie seus pedidos, produtos, categorias e dados do estabelecimento.</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl overflow-x-auto">
                <button
                  onClick={() => setOwnerSection('kanban')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    ownerSection === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
                  Kanban ({storeOrders.length})
                </button>

                <button
                  onClick={() => setOwnerSection('analytics')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    ownerSection === 'analytics' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                  Métricas de Vendas
                </button>

                <button
                  onClick={() => setOwnerSection('products')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    ownerSection === 'products' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-purple-600" />
                  Produtos ({storeProducts.length})
                </button>

                <button
                  onClick={() => setOwnerSection('categories')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    ownerSection === 'categories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-amber-600" />
                  Categorias ({storeCategories.length})
                </button>

                <button
                  onClick={() => { setStoreForm({ ...currentStore }); setIsStoreModalOpen(true); }}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-900 text-white"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  Configurar Marca
                </button>
              </div>
            </div>

            {/* SEÇÃO KANBAN DE PEDIDOS */}
            {ownerSection === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {ORDER_STATUSES.filter(s => s.key !== 'cancelled').map((status) => {
                  const statusOrders = storeOrders.filter(o => (o.status || 'pending') === status.key);

                  return (
                    <div key={status.key} className="bg-slate-100 rounded-2xl p-3 border border-slate-200 flex flex-col min-h-[480px]">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${status.color}`}></span>
                          <span className="font-extrabold text-xs text-slate-800 uppercase">{status.label}</span>
                        </div>
                        <span className="bg-white px-2 py-0.5 rounded-full text-xs font-black border border-slate-200">
                          {statusOrders.length}
                        </span>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto">
                        {statusOrders.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs">Sem pedidos nesta etapa</div>
                        ) : (
                          statusOrders.map((order) => (
                            <div key={order.id} className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-black text-slate-900 text-sm">#{order.orderNumber}</span>
                                {order.isScheduled && (
                                  <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Agendado
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1 text-xs">
                                <div className="font-bold text-slate-800">{order.customerName}</div>
                                <div className="text-slate-500 text-[11px]">📞 {order.customerPhone}</div>
                                {order.isScheduled && (
                                  <div className="text-amber-700 font-bold text-[11px]">
                                    📅 {order.scheduledDate} às {order.scheduledTime}
                                  </div>
                                )}
                                <div className="text-slate-500 text-[11px]">📍 {order.address}</div>
                              </div>

                              <div className="bg-slate-50 p-2 rounded-lg text-[11px] space-y-1">
                                {order.items?.map((it, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-700">
                                    <span>{it.quantity}x {it.name}</span>
                                    <span className="font-bold">{formatCurrency(it.price * it.quantity)}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center justify-between text-xs font-black pt-1">
                                <span className="text-slate-500 font-normal">Total:</span>
                                <span className="text-emerald-600 text-sm">{formatCurrency(order.total)}</span>
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                {status.key === 'pending' && (
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                                    className="w-full bg-blue-600 text-white font-bold py-1.5 rounded-lg text-xs"
                                  >
                                    Mover p/ Preparo ➔
                                  </button>
                                )}
                                {status.key === 'preparing' && (
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'delivering')}
                                    className="w-full bg-purple-600 text-white font-bold py-1.5 rounded-lg text-xs"
                                  >
                                    Enviar p/ Entrega 🛵
                                  </button>
                                )}
                                {status.key === 'delivering' && (
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'completed')}
                                    className="w-full bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-xs"
                                  >
                                    ✓ Concluir Pedido
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SEÇÃO MÉTRICAS */}
            {ownerSection === 'analytics' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400 mb-1">Faturamento Total</div>
                  <div className="text-2xl font-black text-slate-900">{formatCurrency(analyticsMetrics.totalRevenue)}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400 mb-1">Total de Pedidos</div>
                  <div className="text-2xl font-black text-slate-900">{analyticsMetrics.totalOrdersCount}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400 mb-1">Ticket Médio</div>
                  <div className="text-2xl font-black text-slate-900">{formatCurrency(analyticsMetrics.averageTicket)}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400 mb-1">Vendas de Hoje</div>
                  <div className="text-2xl font-black text-slate-900">{formatCurrency(analyticsMetrics.todayRevenue)}</div>
                </div>
              </div>
            )}

            {/* SEÇÃO PRODUTOS */}
            {ownerSection === 'products' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-base">Produtos do Cardápio ({currentStore.name})</h3>
                  <button
                    onClick={() => openProductEditor(null)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Novo Produto
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3.5">Produto</th>
                        <th className="p-3.5">Preço</th>
                        <th className="p-3.5">Estoque Rápido</th>
                        <th className="p-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {storeProducts.map((p) => (
                        <tr key={p.id}>
                          <td className="p-3.5 font-medium flex items-center gap-3">
                            <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                            <div>
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-slate-400 text-xs line-clamp-1">{p.description}</div>
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{formatCurrency(p.price)}</td>
                          <td className="p-3.5">
                            <button
                              onClick={() => toggleProductAvailability(p)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                p.available ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {p.available ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
                              <span>{p.available ? 'Disponível' : 'Esgotado'}</span>
                            </button>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button onClick={() => openProductEditor(p)} className="p-1.5 text-slate-600 hover:text-red-600">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SEÇÃO CATEGORIAS */}
            {ownerSection === 'categories' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Categorias de Produtos</h3>
                    <p className="text-xs text-slate-500">Crie seções normais e caixinhas exclusivas para encomendas agendadas.</p>
                  </div>
                  <button
                    onClick={() => openCategoryEditor(null)}
                    className="bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Nova Categoria
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {storeCategories.map((cat) => (
                    <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {cat.name}
                          {cat.isScheduled && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              📅 Encomendas
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">Ordem: #{cat.order}</div>
                      </div>
                      <button onClick={() => openCategoryEditor(cat)} className="p-1.5 text-slate-600 hover:text-red-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* VISÃO 3: PAINEL MASTER ADMIN (SaaS DESENVOLVEDOR)        */}
        {/* ========================================================= */}
        {viewMode === 'master' && (
          <div className="px-4 py-6 space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2">
                  <ShieldCheck className="text-amber-400" />
                  Painel Mestre do Desenvolvedor (SaaS)
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Cadastre novas empresas parceiras, defina logomarcas (PNG), capa de fundo e gere links exclusivos.
                </p>
              </div>

              <button
                onClick={() => openStoreEditor(null)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Nova Empresa
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((st) => (
                <div key={st.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="flex items-start gap-4">
                    <img src={st.logoImage} alt={st.name} className="w-16 h-16 rounded-2xl object-cover bg-slate-100 border border-slate-200 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-base">{st.name}</h3>
                      <p className="text-xs text-slate-500">ID / Slug: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-bold">{st.id}</code></p>
                      <p className="text-xs text-slate-500 mt-1">📞 WhatsApp: {st.whatsapp}</p>
                      <p className="text-xs text-slate-500">🛵 Taxa de Entrega: {formatCurrency(st.deliveryFee)}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => copyStoreLink(st.id)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 border border-emerald-200"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Link da Loja
                    </button>

                    <button
                      onClick={() => openStoreEditor(st)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1"
                    >
                      <Settings className="w-3.5 h-3.5" /> Configurar Marca
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL: SELEÇÃO DE PRODUTO & OBSERVAÇÃO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="relative h-48 sm:h-56 bg-slate-100 shrink-0">
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 bg-slate-900/70 text-white p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedProduct.name}</h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">{selectedProduct.description}</p>
                <div className="mt-3 text-lg font-black text-red-600">{formatCurrency(selectedProduct.price)}</div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">Observações do item</label>
                <textarea
                  rows="2"
                  placeholder="Ex: Sem cebola, massa bem assada, etc."
                  value={productNote}
                  onChange={(e) => setProductNote(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
                <button onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))} className="p-2 text-slate-600"><Minus className="w-4 h-4" /></button>
                <span className="w-8 text-center font-black text-sm">{productQuantity}</span>
                <button onClick={() => setProductQuantity(productQuantity + 1)} className="p-2 text-slate-600"><Plus className="w-4 h-4" /></button>
              </div>

              <button onClick={handleAddToCart} className="flex-1 bg-red-600 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-between text-sm">
                <span>Adicionar</span>
                <span>{formatCurrency(selectedProduct.price * productQuantity)}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: RESUMO DO CARRINHO */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2"><ShoppingCart className="text-red-500" /> Seu Carrinho</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div key={item.cartId} className="flex gap-3 border-b border-slate-100 pb-3">
                  <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{item.name}</h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-xs">{formatCurrency(item.price * item.quantity)}</span>
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button onClick={() => updateCartQuantity(item.cartId, -1)} className="p-1 text-slate-600"><Minus className="w-3 h-3" /></button>
                        <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.cartId, 1)} className="p-1 text-slate-600"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(cartSubtotal)}</span></div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t"><span>Total</span><span className="text-red-600">{formatCurrency(cartTotal)}</span></div>
              </div>

              <button
                onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                Finalizar Pedido <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT COM CAIXA DE ENCOMENDAS AGENDADAS */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Finalizar Pedido ({currentStore.name})</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSendWhatsAppOrder} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              
              {/* OPÇÃO DE TIPO DE ENTREGA OU RETIRADA */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCheckoutData({ ...checkoutData, deliveryType: 'delivery' })}
                  className={`py-2 rounded-xl font-bold transition text-xs ${
                    checkoutData.deliveryType === 'delivery' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Entrega em Domicílio
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutData({ ...checkoutData, deliveryType: 'pickup' })}
                  className={`py-2 rounded-xl font-bold transition text-xs ${
                    checkoutData.deliveryType === 'pickup' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Retirada no Balcão
                </button>
              </div>

              {/* CAIXINHA DE ENCOMENDAS AGENDADAS */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Encomenda Agendada
                  </span>
                  <input
                    type="checkbox"
                    id="isScheduled"
                    checked={checkoutData.isScheduled || cartHasScheduledItems}
                    onChange={(e) => setCheckoutData({ ...checkoutData, isScheduled: e.target.checked })}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </div>

                {(checkoutData.isScheduled || cartHasScheduledItems) && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="font-bold text-slate-700 block text-[11px] mb-1">Data da Encomenda *</label>
                      <input
                        type="date"
                        required
                        value={checkoutData.scheduledDate}
                        onChange={(e) => setCheckoutData({ ...checkoutData, scheduledDate: e.target.value })}
                        className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block text-[11px] mb-1">Horário Agendado *</label>
                      <input
                        type="time"
                        required
                        value={checkoutData.scheduledTime}
                        onChange={(e) => setCheckoutData({ ...checkoutData, scheduledTime: e.target.value })}
                        className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Seu Nome Completo *"
                  value={checkoutData.customerName}
                  onChange={(e) => setCheckoutData({ ...checkoutData, customerName: e.target.value })}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <input
                  type="tel"
                  required
                  placeholder="Seu WhatsApp com DDD *"
                  value={checkoutData.customerPhone}
                  onChange={(e) => setCheckoutData({ ...checkoutData, customerPhone: e.target.value })}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {checkoutData.deliveryType === 'delivery' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Rua / Avenida *"
                    value={checkoutData.addressStreet}
                    onChange={(e) => setCheckoutData({ ...checkoutData, addressStreet: e.target.value })}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Bairro *"
                    value={checkoutData.addressNeighborhood}
                    onChange={(e) => setCheckoutData({ ...checkoutData, addressNeighborhood: e.target.value })}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block text-[11px] mb-1">Forma de Pagamento</label>
                <select
                  value={checkoutData.paymentMethod}
                  onChange={(e) => setCheckoutData({ ...checkoutData, paymentMethod: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="pix">PIX (Chave enviada no WhatsApp)</option>
                  <option value="card">Cartão de Débito / Crédito (na entrega)</option>
                  <option value="cash">Dinheiro</option>
                </select>
              </div>

              {checkoutData.paymentMethod === 'cash' && (
                <input
                  type="text"
                  placeholder="Precisa de troco para quanto? (Ex: R$ 100)"
                  value={checkoutData.cashChange}
                  onChange={(e) => setCheckoutData({ ...checkoutData, cashChange: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl shadow-xl flex items-center justify-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" /> Enviar Pedido no WhatsApp da Loja
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÃO DE EMPRESA (MASTER ADMIN / PROPRIETÁRIO) */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b">
              <h3 className="font-extrabold text-base text-slate-900">Configurar Dados & Marca da Empresa</h3>
              <button onClick={() => setIsStoreModalOpen(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nome do Estabelecimento *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ID Exclusivo / Slug URL *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.id}
                    onChange={(e) => setStoreForm({ ...storeForm, id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp com DDD *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.whatsapp}
                    onChange={(e) => setStoreForm({ ...storeForm, whatsapp: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Taxa de Entrega (R$)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={storeForm.deliveryFee}
                    onChange={(e) => setStoreForm({ ...storeForm, deliveryFee: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              {/* UPLOAD DE LOGO PNG E CAPA DE FUNDO COM PREVIEW */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border">
                <div>
                  <label className="font-bold text-slate-800 text-[11px] block mb-1">Logomarca (PNG transparente)</label>
                  <label className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Upload Logo PNG
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleImageFileUpload(e, (data) => setStoreForm({ ...storeForm, logoImage: data }))} />
                  </label>
                  {storeForm.logoImage && (
                    <img src={storeForm.logoImage} alt="Logo Preview" className="w-12 h-12 rounded-lg object-cover mt-2 border bg-white" />
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-800 text-[11px] block mb-1">Capa de Fundo</label>
                  <label className="bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer inline-flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Upload Capa
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFileUpload(e, (data) => setStoreForm({ ...storeForm, coverImage: data }))} />
                  </label>
                  {storeForm.coverImage && (
                    <img src={storeForm.coverImage} alt="Capa Preview" className="w-20 h-12 rounded-lg object-cover mt-2 border" />
                  )}
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg">
                Salvar Empresa
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITOR DE PRODUTO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b">
              <h3 className="font-bold text-base">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs sm:text-sm">
              <input
                type="text"
                required
                placeholder="Nome do Produto *"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Preço (R$) *"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="p-2.5 bg-slate-50 border rounded-xl"
                />
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  className="p-2.5 bg-slate-50 border rounded-xl"
                  required
                >
                  <option value="">Selecione Categoria...</option>
                  {storeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <textarea
                rows="2"
                placeholder="Descrição dos ingredientes..."
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
              <input
                type="url"
                placeholder="URL da Imagem do Prato"
                value={productForm.imageUrl}
                onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
              <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg">
                Salvar Produto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITOR DE CATEGORIA */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b">
              <h3 className="font-bold text-base">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs sm:text-sm">
              <input
                type="text"
                required
                placeholder="Nome da Categoria *"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
              <input
                type="number"
                placeholder="Ordem de exibição"
                value={categoryForm.order}
                onChange={(e) => setCategoryForm({ ...categoryForm, order: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isScheduledCat"
                  checked={categoryForm.isScheduled}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isScheduled: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <label htmlFor="isScheduledCat" className="font-bold text-slate-700 cursor-pointer">
                  Marcar como Categoria de Encomendas Agendadas 📅
                </label>
              </div>

              <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg">
                Salvar Categoria
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}