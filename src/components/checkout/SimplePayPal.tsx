/**
 * Componente de PayPal simplificado para debugging
 */
import React from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface SimplePayPalProps {
  clientId: string;
  onCreateOrder: () => Promise<string>;
  onApprove: (data: any) => Promise<void>;
  onError: (err: any) => void;
  onCancel: () => void;
}

export const SimplePayPal: React.FC<SimplePayPalProps> = ({
  clientId,
  onCreateOrder,
  onApprove,
  onError,
  onCancel
}) => {
  console.log('🚀 PayPal component loading...');

  const paypalOptions = {
    clientId: clientId,
    currency: "USD",
    intent: "capture" as const
  };

  return (
    <div className="paypal-container">
      <PayPalScriptProvider options={paypalOptions}>
        <PayPalButtons
          style={{ 
            layout: 'vertical', 
            color: 'blue', 
            shape: 'rect', 
            label: 'paypal',
            height: 40
          }}
          createOrder={async () => {
            console.log('🎯 Creating PayPal order...');
            try {
              const orderId = await onCreateOrder();
              console.log('✅ PayPal order created:', orderId);
              return orderId;
            } catch (error) {
              console.error('❌ Error creating PayPal order:', error);
              throw error;
            }
          }}
          onApprove={async (data) => {
            console.log('🎯 PayPal payment approved, processing...');
            try {
              await onApprove(data);
              console.log('✅ PayPal payment processed successfully');
            } catch (error) {
              console.error('❌ Error processing PayPal payment:', error);
              throw error;
            }
          }}
          onError={(err) => {
            console.error('🎯 PayPal error occurred:', err);
            onError(err);
          }}
          onCancel={() => {
            console.log('🎯 PayPal payment cancelled');
            onCancel();
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
};