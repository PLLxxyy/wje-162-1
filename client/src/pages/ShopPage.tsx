import { useState, useEffect } from 'react';
import { api } from '../api';
import { User, Product, PRODUCT_ICONS } from '../types';

interface Props {
  user: User;
  onRefreshUser: () => Promise<void>;
}

export default function ShopPage({ user, onRefreshUser }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data.products);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleExchange = async (product: Product) => {
    if (user.points < product.price) {
      showToast('error', `积分不足，需要${product.price}积分，当前${user.points}积分`);
      return;
    }

    if (!confirm(`确认用 ${product.price} 积分兑换「${product.name}」？`)) return;

    setExchanging(product.id);
    try {
      const data = await api.exchangeProduct(product.id);
      showToast('success', data.message);
      await onRefreshUser();
      loadProducts();
    } catch (err: any) {
      showToast('error', err.message || '兑换失败');
    } finally {
      setExchanging(null);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return <div className="card"><div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div></div>;
  }

  return (
    <div>
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>🛍️ 积分商城</div>
          <div style={{ fontSize: 14, color: '#888' }}>
            当前积分：<span style={{ color: '#2d8a4e', fontWeight: 700, fontSize: 18 }}>{user.points}</span>
          </div>
        </div>
      </div>

      <div className="product-grid">
        {products.map((product) => {
          const icon = PRODUCT_ICONS[product.id] || '🎁';
          const canAfford = user.points >= product.price;
          return (
            <div key={product.id} className="product-card">
              <div className="product-icon">{icon}</div>
              <div className="product-body">
                <div className="product-name">{product.name}</div>
                <div className="product-desc">{product.description}</div>
                <div className="product-footer">
                  <div>
                    <div className="product-price">{product.price} <small>积分</small></div>
                    <div className="stock">库存: {product.stock}</div>
                  </div>
                  <button
                    className="btn-exchange"
                    disabled={!canAfford || exchanging === product.id}
                    onClick={() => handleExchange(product)}
                  >
                    {exchanging === product.id ? '兑换中...' : canAfford ? '兑换' : '积分不足'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
