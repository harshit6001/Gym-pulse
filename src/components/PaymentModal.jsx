import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Lock, Smartphone, X, ArrowRight, RefreshCw, CreditCard } from 'lucide-react';

export default function PaymentModal({ member, plan, onClose, onSuccessPayment }) {
  const [paymentProvider, setPaymentProvider] = useState('GPAY_UPI'); // GPAY_UPI, PHONEPE_UPI, PAYTM_UPI, CARD
  const [paymentState, setPaymentState] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, FAILED
  const [transactionRef, setTransactionRef] = useState('');

  const handleSimulatePayment = () => {
    setPaymentState('PROCESSING');
    
    // Simulate payment gateway roundtrip delay (1.5 seconds)
    setTimeout(() => {
      const generatedTxRef = 'UPI-' + Math.floor(100000000000 + Math.random() * 900000000000);
      setTransactionRef(generatedTxRef);
      setPaymentState('SUCCESS');

      // Trigger single-execution membership extension callback
      onSuccessPayment({
        memberId: member.id,
        planId: plan.id,
        amount: plan.finalPrice,
        provider: paymentProvider,
        transactionRef: generatedTxRef,
        idempotencyKey: `ik_${member.id}_${Date.now()}`
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        {paymentState === 'IDLE' && (
          <>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                Secure Payment Gateway
              </span>
              <h3 className="text-xl font-black text-white mt-2">Renew: {plan.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">₹{plan.finalPrice.toLocaleString('en-IN')}</span>
                <span className="text-xs line-through text-slate-500">₹{plan.basePrice.toLocaleString('en-IN')}</span>
                <span className="text-xs text-amber-400 font-bold">({plan.discountPercent}% OFF)</span>
              </div>
            </div>

            <div className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-slate-100">Membership Benefits Included:</div>
              <ul className="space-y-1 text-slate-400">
                {plan.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Select Instant Indian Payment Method:</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentProvider('GPAY_UPI')}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    paymentProvider === 'GPAY_UPI' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-[#0B0F17] border-slate-800 text-slate-400'
                  }`}
                >
                  <span>Google Pay UPI</span>
                  <Smartphone className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentProvider('PHONEPE_UPI')}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    paymentProvider === 'PHONEPE_UPI' ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-[#0B0F17] border-slate-800 text-slate-400'
                  }`}
                >
                  <span>PhonePe UPI</span>
                  <Smartphone className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentProvider('PAYTM_UPI')}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    paymentProvider === 'PAYTM_UPI' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-[#0B0F17] border-slate-800 text-slate-400'
                  }`}
                >
                  <span>Paytm UPI</span>
                  <Smartphone className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentProvider('CARD')}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    paymentProvider === 'CARD' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-[#0B0F17] border-slate-800 text-slate-400'
                  }`}
                >
                  <span>RuPay / Card</span>
                  <CreditCard className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={handleSimulatePayment}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Pay ₹{plan.finalPrice.toLocaleString('en-IN')} via {paymentProvider.replace('_', ' ')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {paymentState === 'PROCESSING' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin" />
            <div>
              <h4 className="text-lg font-extrabold text-white">Communicating with Bank Gateway...</h4>
              <p className="text-xs text-slate-400 mt-1">Verifying UPI PIN & checking idempotency token</p>
            </div>
          </div>
        )}

        {paymentState === 'SUCCESS' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-xl font-black text-white">Payment Verified & Membership Extended!</h4>
              <p className="text-xs text-emerald-400 font-semibold mt-1">Status: PAID (Single-Execution Confirmed)</p>
            </div>

            <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 space-y-1 text-left">
              <div>Txn Ref: <span className="text-emerald-400 font-bold">{transactionRef}</span></div>
              <div>Amount: ₹{plan.finalPrice.toLocaleString('en-IN')}</div>
              <div>Member: {member.name}</div>
              <div>Extended Expiry: <strong className="text-white">Updated Safely</strong></div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg"
            >
              Done & View Updated Membership
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
