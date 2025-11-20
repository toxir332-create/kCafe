import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';

interface OrderItem {
  id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_requests?: string;
}

interface ReceiptPrintProps {
  order: {
    id: string;
    total_amount: number;
    special_instructions?: string;
    created_at: string;
  };
  orderItems: OrderItem[];
  tableNumber: number;
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  waiterName?: string;
  ownerCard?: string;
  ownerQrUrl?: string;
  onClose: () => void;
}

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({
  order,
  orderItems,
  tableNumber,
  restaurantName,
  restaurantPhone,
  restaurantAddress,
  waiterName,
  ownerCard,
  ownerQrUrl,
  onClose
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Resolve settings from props first, then local cache as fallback
  let cached: any = null;
  try { cached = JSON.parse(localStorage.getItem('restaurant_settings_cache') || 'null'); } catch { cached = null; }
  const resolvedName = restaurantName || cached?.restaurant_name || 'Mening Restoranim';
  const resolvedPhone = restaurantPhone || cached?.phone || undefined;
  const resolvedAddress = restaurantAddress || cached?.address || undefined;
  const resolvedLogoUrl = (cached?.logo_url && typeof cached.logo_url === 'string') ? cached.logo_url : undefined;
  const resolvedOwnerCard = ownerCard || cached?.owner_card_number || undefined;
  const resolvedOwnerQr = ownerQrUrl || cached?.owner_qr_url || undefined;

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=600,width=400');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Chek</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body {
        font-family: 'Courier New', monospace;
        margin: 20px;
        font-size: 12px;
      }
      .receipt {
        max-width: 300px;
        margin: 0 auto;
      }
      .header {
        text-align: center;
        border-bottom: 2px dashed #000;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .info {
        margin: 10px 0;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        margin: 5px 0;
      }
      .items {
        border-top: 2px dashed #000;
        border-bottom: 2px dashed #000;
        padding: 10px 0;
        margin: 10px 0;
      }
      .item {
        margin: 8px 0;
      }
      .item-name {
        font-weight: bold;
      }
      .item-details {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
      }
      .total {
        font-size: 16px;
        font-weight: bold;
        text-align: right;
        margin: 15px 0;
      }
      .qr-section {
        text-align: center;
        margin: 20px 0;
        padding: 15px;
        border: 2px dashed #000;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 11px;
      }
      @media print {
        body { margin: 0; }
        .no-print { display: none; }
      }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();

    setTimeout(() => {
      try { printWindow.print(); } catch {}
      try { printWindow.close(); } catch {}
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Chekni Chop Etish</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div ref={receiptRef} className="bg-white">
            <div className="receipt max-w-sm mx-auto">
              <div className="header">
                {resolvedLogoUrl && (
                  <div style={{ marginBottom: '8px' }}>
                    <img src={resolvedLogoUrl} alt="Logo" style={{ height: 56, width: 56, objectFit: 'contain', borderRadius: '50%', margin: '0 auto' }} />
                  </div>
                )}
                <div className="title">{resolvedName}</div>
                {resolvedPhone && (
                  <div style={{ fontSize: '11px', marginTop: '5px' }}>
                    Tel: {resolvedPhone}
                  </div>
                )}
                {resolvedAddress && (
                  <div style={{ fontSize: '11px' }}>
                    Manzil: {resolvedAddress}
                  </div>
                )}
              </div>

              <div className="info">
                <div className="info-row">
                  <span>Chek №:</span>
                  <span style={{ fontWeight: 'bold' }}>{(order?.id || '00000000').slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="info-row">
                  <span>Stol:</span>
                  <span style={{ fontWeight: 'bold' }}>{tableNumber}-stol</span>
                </div>
                {waiterName && (
                  <div className="info-row">
                    <span>Ofitsiant:</span>
                    <span>{waiterName}</span>
                  </div>
                )}
                <div className="info-row">
                  <span>Sana:</span>
                  <span>{new Date(order?.created_at || new Date().toISOString()).toLocaleString('uz-UZ', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>

              <div className="items">
                {(orderItems || []).map((item, index) => (
                  <div key={index} className="item">
                    <div className="item-name">{item.menu_item_name}</div>
                    <div className="item-details">
                      <span>{Number(item.quantity).toLocaleString()} x {Number(item.unit_price).toLocaleString()} so'm</span>
                      <span style={{ fontWeight: 'bold' }}>{Number(item.subtotal).toLocaleString()} so'm</span>
                    </div>
                    {item.special_requests && (
                      <div style={{ fontSize: '10px', fontStyle: 'italic', marginTop: '3px' }}>
                        * {item.special_requests}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {order.special_instructions && (
                <div style={{ margin: '10px 0', fontSize: '11px', fontStyle: 'italic' }}>
                  <strong>Izoh:</strong> {order.special_instructions}
                </div>
              )}

              <div className="total">
                JAMI: {Number(order?.total_amount || 0).toLocaleString()} so'm
              </div>

              <div className="qr-section">
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
                  To'lov uchun QR Kodni Skanerlang
                </div>
                <div style={{
                  width: '150px',
                  height: '150px',
                  margin: '0 auto',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', marginBottom: '5px' }}>QR</div>
                    <div style={{ fontSize: '10px' }}>KOD</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '5px' }}>
                      {Number(order?.total_amount || 0).toLocaleString()} so'm
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', marginTop: '10px' }}>
                  Buyurtma ID: {(order?.id || '').slice(0, 12)}
                </div>
                {resolvedOwnerCard && (
                  <div style={{ fontSize: '10px', marginTop: '5px' }}>
                    Egasi karta: <strong>{resolvedOwnerCard}</strong>
                  </div>
                )}
                {resolvedOwnerQr && (
                  <div style={{ fontSize: '10px', marginTop: '5px' }}>
                    QR URL: {resolvedOwnerQr}
                  </div>
                )}
              </div>

              <div className="footer">
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  Tashrif buyurganingiz uchun rahmat!
                </div>
                <div>Yana kutib qolamiz!</div>
                <div style={{ marginTop: '10px', borderTop: '1px solid #000', paddingTop: '10px' }}>
                  Izoh: QR kod orqali to'lov amalga oshirilganda
                  <br />
                  chek avtomatik tasdiqlang
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
            >
              Yopish
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <Printer className="w-5 h-5 mr-2" />
              Chop Etish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
