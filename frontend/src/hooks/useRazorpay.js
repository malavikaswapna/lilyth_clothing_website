import { useState } from 'react';
import { ordersAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useRazorpay = () => {
  const [loading, setLoading] = useState(false);

  const processPayment = async (orderData, onSuccess, onFailure) => {
    try {
      setLoading(true);

      // Calculate total amount
      const subtotal = orderData.items.reduce((sum, item) => 
        sum + (item.unitPrice * item.quantity), 0
      );
      const shipping = orderData.shippingCost || 0;
      const tax = subtotal * 0.18; // 18% GST
      const total = subtotal + shipping + tax;

      // Step 1: Create Razorpay order
      const paymentOrderResponse = await ordersAPI.createPaymentOrder({
        amount: total,
        currency: 'INR'
      });

      const { order, key_id } = paymentOrderResponse.data;

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'LILYTH',
        description: 'Fashion Purchase',
        image: '/logo192.png', // Your logo
        order_id: order.id,
        handler: async function (response) {
          try {
            // Step 3: Verify payment
            const verificationResponse = await ordersAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData: {
                ...orderData,
                total
              }
            });

            if (verificationResponse.data.success) {
              toast.success('Payment successful! Order placed.');
              onSuccess(verificationResponse.data.order);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
            onFailure(error);
          }
        },
        prefill: {
          name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
          email: orderData.userEmail || '',
          contact: orderData.userPhone || ''
        },
        notes: {
          address: orderData.shippingAddress.addressLine1
        },
        theme: {
          color: '#b87049' // Your primary color
        },
        modal: {
          ondismiss: function() {
            toast.info('Payment cancelled');
            onFailure(new Error('Payment cancelled by user'));
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', async function (response) {
        console.error('Payment failed:', response.error);
        
        try {
          await ordersAPI.handlePaymentFailure({
            razorpay_order_id: order.id,
            error_description: response.error.description
          });
        } catch (error) {
          console.error('Error logging payment failure:', error);
        }
        
        toast.error(`Payment failed: ${response.error.description}`);
        onFailure(response.error);
      });

      rzp.open();

    } catch (error) {
      console.error('Payment process error:', error);
      toast.error('Failed to initiate payment');
      onFailure(error);
    } finally {
      setLoading(false);
    }
  };

  return { processPayment, loading };
};