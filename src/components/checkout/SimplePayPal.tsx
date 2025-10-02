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
  console.log('🚀 SimplePayPal component rendering with clientId:', clientId.slice(0, 10) + '...');

  const paypalOptions = {
    clientId: clientId,
    currency: "USD",
    intent: "capture" as const
  };

  return (
    <div className="paypal-container">
      <div className="mb-2 text-xs text-gray-600">
        PayPal Component Status: Loaded ✅<br/>
        Client ID: {clientId.slice(0, 15)}...
      </div>
      
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
            console.log('🎯 PayPal createOrder called');
            try {
              const orderId = await onCreateOrder();
              console.log('✅ Order created:', orderId);
              return orderId;
            } catch (error) {
              console.error('❌ Error in createOrder:', error);
              throw error;
            }
          }}
          onApprove={async (data) => {
            console.log('🎯 PayPal onApprove called with:', data);
            try {
              await onApprove(data);
              console.log('✅ Approval processed');
            } catch (error) {
              console.error('❌ Error in onApprove:', error);
              throw error;
            }
          }}
          onError={(err) => {
            console.error('🎯 PayPal onError called:', err);
            onError(err);
          }}
          onCancel={() => {
            console.log('🎯 PayPal onCancel called');
            onCancel();
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
};