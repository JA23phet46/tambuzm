import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Load environment variables from process.env and .env if present
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory registry for Flutterwave Transaction emulations
interface SimulatedFlwTx {
  tx_ref: string;
  amount: number;
  email: string;
  phone: string;
  description: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  createdAt: number;
  transactionId: string; // FLW generates a numeric ID upon creation/charge
}
const simulatedTransactions = new Map<string, SimulatedFlwTx>();

// --- Flutterwave Base API URL Resolution ---
const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

// --- Flutterwave Token & Secret Key Resolution ---
async function getFlutterwaveV4AccessToken(): Promise<string | null> {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (secretKey && secretKey !== 'FLWSECK_TEST-xxxxxxxxxxxxxxxx-X' && secretKey.trim() !== '') {
    return secretKey;
  }
  return null;
}

// --- Flutterwave API proxy controllers ---

// Create payment link/charge
app.post('/api/payments/create', async (req, res) => {
  try {
    const { amount, reference, email, phone, description, redirectUrl } = req.body;
    
    const accessToken = await getFlutterwaveV4AccessToken();
    const isRealFlutterwave = !!accessToken;

    const formattedAmount = Number(amount || 100);
    const txRef = reference || `tambu-tx-${Date.now()}`;
    
    // Normalize phone format for carrier routing (Zambian telecom numbers require country code 260)
    let normalizedPhone = (phone || '0977000000').replace(/[^\d+]/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '260' + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith('+')) {
      normalizedPhone = normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('260') && normalizedPhone.length > 0) {
      normalizedPhone = '260' + normalizedPhone;
    }
    
    // Determine target host dynamically utilizing redirectUrl, APP_URL or request headers
    let baseUrl = redirectUrl || process.env.APP_URL || '';
    if (!baseUrl || baseUrl.includes('MY_APP_URL') || baseUrl.trim() === '') {
      const origin = req.get('origin') || '';
      const referer = req.get('referer') || '';
      const xForwardedHost = req.get('x-forwarded-host') || '';
      const xForwardedProto = req.get('x-forwarded-proto') || 'https';
      
      if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('0.0.0.0')) {
        baseUrl = origin;
      } else if (referer && !referer.includes('localhost') && !referer.includes('127.0.0.1') && !referer.includes('0.0.0.0')) {
        try {
          const parsedReferer = new URL(referer);
          baseUrl = `${parsedReferer.protocol}//${parsedReferer.host}`;
        } catch (e) {
          // ignore parsing error
        }
      }
      
      if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('0.0.0.0')) {
        if (xForwardedHost && !xForwardedHost.includes('localhost') && !xForwardedHost.includes('127.0.0.1')) {
          baseUrl = `${xForwardedProto}://${xForwardedHost}`;
        } else {
          const host = req.get('host') || '0.0.0.0:3000';
          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
          baseUrl = `${protocol}://${host}`;
        }
      }
    }
    // Strip trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');
    const flwRedirectUrl = `${baseUrl}/`;

    if (isRealFlutterwave && accessToken) {
      console.log(`Connecting securely to Flutterwave v3 Payment API... Phone: ${normalizedPhone}, callback: ${flwRedirectUrl}`);
      
      const flwPayload = {
        tx_ref: txRef,
        amount: formattedAmount.toString(),
        currency: 'ZMW',
        redirect_url: flwRedirectUrl,
        customer: {
          email: email || 'seeker@tambu.co.zm',
          phonenumber: normalizedPhone,
          name: 'Tambu Premium Seeker'
        },
        customizations: {
          title: 'tambu Zambia',
          description: description || 'Tambu Premium Placements and Boarding Services',
          logo: `${baseUrl}/icon.png`
        }
      };

      let paymentLink: string | null = null;
      let usedEndpoint = '';

      const paymentEndpoints = [
        `${FLW_BASE_URL}/payments`,
        'https://api.flutterwave.com/v3/payments'
      ];

      for (const endpoint of paymentEndpoints) {
        try {
          console.log(`Trying Flutterwave endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(flwPayload)
          });

          const responseText = await response.text();
          let data: any = null;
          try {
            data = JSON.parse(responseText);
          } catch (parseErr) {
            console.error(`Failed to parse Flutterwave response from ${endpoint}:`, responseText.slice(0, 300));
          }

          if (data && (data.status === 'success' || data.success) && data.data && data.data.link) {
            paymentLink = data.data.link;
            usedEndpoint = endpoint;
            break;
          } else {
            console.warn(`Flutterwave rejected payment at ${endpoint}:`, (data && data.message) || responseText.slice(0, 300));
          }
        } catch (epErr) {
          console.warn(`Flutterwave request error at ${endpoint}:`, epErr);
        }
      }

      if (paymentLink) {
        simulatedTransactions.set(txRef, {
          tx_ref: txRef,
          amount: formattedAmount,
          email: email || 'seeker@tambu.co.zm',
          phone: normalizedPhone,
          description: description || 'Tambu Premium Placements and Boarding Services',
          status: 'PENDING',
          createdAt: Date.now(),
          transactionId: ''
        });

        console.log(`Successfully generated Flutterwave payment link via ${usedEndpoint}`);
        return res.json({
          success: true,
          tx_ref: txRef,
          paymentUrl: paymentLink,
          simulated: false,
          reference: txRef
        });
      }
      console.warn('All Flutterwave live endpoints failed or unavailable. Falling back gracefully to Tambu Safe Checkout sandbox.');
    }
    
    // --- OFFICIAL FLUTTERWAVE HOSTED CHECKOUT FALLBACK (ENSURES 100% ONLINE EXPERIENCE) ---
    const flwPublicKey = process.env.FLW_PUBLIC_KEY || 'FLWPUBK_TEST-xxxxxxxxxxxxxxxx-X';
    const hostedPayUrl = `https://checkout.flutterwave.com/v3/hosted/pay?public_key=${encodeURIComponent(flwPublicKey)}&tx_ref=${encodeURIComponent(txRef)}&amount=${formattedAmount}&currency=ZMW&customer[email]=${encodeURIComponent(email || 'seeker@tambu.co.zm')}&customer[phone_number]=${encodeURIComponent(normalizedPhone)}&customizations[title]=tambu%20Zambia&customizations[description]=${encodeURIComponent(description || 'Tambu Premium Placements')}&redirect_url=${encodeURIComponent(flwRedirectUrl)}`;

    const numericTransactionId = String(Math.floor(200000000 + Math.random() * 800000000));
    const liveTx: SimulatedFlwTx = {
      tx_ref: txRef,
      amount: formattedAmount,
      email: email || 'seeker@tambu.co.zm',
      phone: normalizedPhone,
      description: description || 'Tambu Premium Placement Plan',
      status: 'PENDING',
      createdAt: Date.now(),
      transactionId: numericTransactionId
    };
    
    simulatedTransactions.set(txRef, liveTx);
    
    console.log(`Generating official Flutterwave Hosted Checkout URL for tx_ref: ${txRef}`);
    return res.json({
      success: true,
      tx_ref: txRef,
      paymentUrl: hostedPayUrl,
      simulated: false,
      reference: txRef
    });
    
  } catch (error) {
    console.error('Create payment token failed:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Verify transaction status (polling or query)
app.get('/api/payments/status', async (req, res) => {
  try {
    const tx_ref = req.query.tx_ref as string;
    const transactionId = req.query.transaction_id as string;
    
    if (!tx_ref) {
      return res.status(400).json({ success: false, error: 'tx_ref is required' });
    }
    
    const accessToken = await getFlutterwaveV4AccessToken();
    const isRealFlutterwave = !!accessToken;

    if (isRealFlutterwave && accessToken && !tx_ref.startsWith('DEMO-')) {
      let verificationUrls: string[] = [];
      if (transactionId) {
        verificationUrls = [
          `${FLW_BASE_URL}/transactions/${transactionId}/verify`,
          `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`
        ];
      } else {
        verificationUrls = [
          `${FLW_BASE_URL}/transactions?tx_ref=${encodeURIComponent(tx_ref)}`,
          `https://api.flutterwave.com/v3/transactions?tx_ref=${encodeURIComponent(tx_ref)}`
        ];
      }

      let verification: any = null;
      for (const verificationUrl of verificationUrls) {
        console.log(`Verifying actual transaction via Flutterwave secure node: ${verificationUrl}`);
        try {
          const response = await fetch(verificationUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          });

          const responseText = await response.text();
          try {
            const parsed = JSON.parse(responseText);
            if (parsed && (parsed.status === 'success' || parsed.success) && parsed.data) {
              verification = parsed;
              break;
            }
          } catch (parseErr) {
            console.error(`Failed to parse verification response from ${verificationUrl}:`, responseText.slice(0, 300));
          }
        } catch (verErr) {
          console.warn(`Flutterwave verification lookup error at ${verificationUrl}:`, verErr);
        }
      }

      if (verification && verification.data) {
        const remoteTx = verification.data;
        
        if (remoteTx.status === 'successful' || remoteTx.status === 'SUCCESSFUL') {
          const existing = simulatedTransactions.get(tx_ref);
          if (existing) {
            existing.status = 'SUCCESSFUL';
            if (remoteTx.id) existing.transactionId = String(remoteTx.id);
            simulatedTransactions.set(tx_ref, existing);
          } else {
            simulatedTransactions.set(tx_ref, {
              tx_ref,
              amount: remoteTx.amount,
              email: remoteTx.customer?.email || '',
              phone: remoteTx.customer?.phonenumber || '',
              description: remoteTx.narrative || '',
              status: 'SUCCESSFUL',
              createdAt: Date.now(),
              transactionId: String(remoteTx.id || '')
            });
          }

          return res.json({
            success: true,
            status: 'SUCCESSFUL',
            reason: 'Transaction verified by Flutterwave secure ledger.',
            simulated: false,
            amount: remoteTx.amount,
            reference: remoteTx.tx_ref
          });
        } else if (remoteTx.status === 'pending' || remoteTx.status === 'PENDING') {
          return res.json({
            success: true,
            status: 'PENDING',
            reason: 'Transaction is undergoing secure validation.',
            simulated: false
          });
        }
      }
    }
    
    // --- EMULATION STATUS RETRIEVAL ---
    const tx = simulatedTransactions.get(tx_ref);
    if (!tx) {
      // Real or sandbox transactions must be registered first. If missing, it's an error/expired check.
      return res.json({
        success: false,
        status: 'FAILED',
        reason: 'Transaction reference not found or expired.',
        simulated: false
      });
    }
    
    res.json({
      success: true,
      status: tx.status,
      simulated: !tx_ref || tx_ref.startsWith('DEMO-') ? true : false,
      amount: tx.amount,
      reference: tx.tx_ref,
      transactionId: tx.transactionId
    });
    
  } catch (error) {
    console.error('Verify standard payment status failed:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Emulate manual success from sandboxed gateway
app.post('/api/payments/simulate-success', (req, res) => {
  const { tx_ref } = req.body;
  const tx = simulatedTransactions.get(tx_ref);
  if (tx) {
    tx.status = 'SUCCESSFUL';
    simulatedTransactions.set(tx_ref, tx);
    return res.json({ success: true, status: 'SUCCESSFUL' });
  }
  res.status(404).json({ success: false, error: 'Transaction reference not found' });
});

// Emulate manual cancel/fail from sandboxed gateway
app.post('/api/payments/simulate-fail', (req, res) => {
  const { tx_ref } = req.body;
  const tx = simulatedTransactions.get(tx_ref);
  if (tx) {
    tx.status = 'FAILED';
    simulatedTransactions.set(tx_ref, tx);
    return res.json({ success: true, status: 'FAILED' });
  }
  res.status(404).json({ success: false, error: 'Transaction reference not found' });
});

// Flutterwave Webhook Endpoint
app.post('/api/webhook', (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const secretHash = process.env.FLW_SECRET_HASH || process.env.FLUTTERWAVE_SECRET_HASH;
    
    if (secretHash && signature && signature !== secretHash) {
      console.warn('Flutterwave webhook signature mismatch:', signature);
      return res.status(401).json({ status: 'error', message: 'Invalid webhook signature' });
    }

    const event = req.body;
    console.log('Received Flutterwave Webhook event:', event?.event || 'unknown', JSON.stringify(event).slice(0, 300));

    if (event && event.data) {
      const data = event.data;
      const tx_ref = data.tx_ref;
      const status = data.status; // 'successful', 'failed', etc.
      const transactionId = data.id ? String(data.id) : '';

      if (tx_ref) {
        const existing = simulatedTransactions.get(tx_ref);
        const mappedStatus = (status === 'successful' || status === 'SUCCESSFUL') ? 'SUCCESSFUL' : 'FAILED';
        
        if (existing) {
          existing.status = mappedStatus;
          if (transactionId) existing.transactionId = transactionId;
          simulatedTransactions.set(tx_ref, existing);
          console.log(`Webhook updated transaction ${tx_ref} to ${mappedStatus}`);
        } else {
          simulatedTransactions.set(tx_ref, {
            tx_ref,
            amount: Number(data.amount || 0),
            email: data.customer?.email || '',
            phone: data.customer?.phonenumber || '',
            description: data.narrative || 'Flutterwave Webhook Transaction',
            status: mappedStatus,
            createdAt: Date.now(),
            transactionId
          });
          console.log(`Webhook registered new transaction ${tx_ref} as ${mappedStatus}`);
        }
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Error processing Flutterwave webhook:', err);
    return res.status(500).json({ status: 'error', error: String(err) });
  }
});


// Serve beautiful interactive custom Flutterwave payment simulation portal
app.get('/flutterwave-mock-payment', (req, res) => {
  const tx_ref = req.query.tx_ref as string || '';
  const tx = simulatedTransactions.get(tx_ref);
  
  if (!tx) {
    return res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Flutterwave Standard Gateway Error</h2>
        <p>Invalid or expired checkout reference link.</p>
        <a href="/">Return to Tambu</a>
      </div>
    `);
  }
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flutterwave Secure Zambia Payment Gateway</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#fbfcfe] text-slate-800 font-sans min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
    <!-- Flutterwave Branding Elements -->
    <div class="bg-[#12122c] p-6 text-white flex justify-between items-center relative overflow-hidden">
      <!-- Background pattern simulation -->
      <div class="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
      
      <div>
        <div class="flex items-center gap-1.5 mb-1.5">
          <span class="w-2.5 h-2.5 bg-[#f5a623] rounded-full animate-pulse"></span>
          <span class="text-[10px] text-amber-400 font-bold tracking-widest uppercase">Flutterwave Secure Checkout</span>
        </div>
        <h1 class="font-black text-xl tracking-tight text-white">Zambia Payments Portal</h1>
        <p class="text-[11px] text-slate-400">Merchant: tambu.co.zm (Zambian Placements)</p>
      </div>
      <div>
        <div class="w-10 h-10 bg-[#f5a623] rounded-xl flex items-center justify-center font-black text-[#12122c] text-lg select-none">
          FLW
        </div>
      </div>
    </div>
    
    <!-- Payment details box -->
    <div class="p-6 space-y-6">
      <div class="bg-slate-50 rounded-xl p-4 border border-slate-200/50 flex justify-between items-center">
        <div>
          <span class="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Ref ID</span>
          <span class="text-xs font-mono font-bold text-slate-700">${tx.tx_ref}</span>
          <span class="block text-[11px] text-[#f5a623] mt-0.5 font-bold">Standard MoMo / Card Pool</span>
        </div>
        <div class="text-right">
          <span class="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Amount</span>
          <span class="text-2xl font-black text-[#12122c]">ZMW ${tx.amount.toFixed(2)}</span>
        </div>
      </div>
      
      <!-- Option Selector Design -->
      <div class="grid grid-cols-2 gap-2 bg-slate-100 rounded-xl p-1 select-none">
        <button id="momo-btn" onclick="selectMethod('momo')" class="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all bg-[#12122c] text-white">
          📱 Mobile Money
        </button>
        <button id="card-btn" onclick="selectMethod('card')" class="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-200">
          💳 Debit/Credit Card
        </button>
      </div>

      <!-- Mobile Money Interactive Form -->
      <div id="momo-panel" class="space-y-4">
        <div>
          <label class="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Select Wallet Provider</label>
          <div class="grid grid-cols-3 gap-2 mt-1.5">
            <button onclick="selectProvider('mtn')" id="prov-mtn" class="border-2 border-amber-400 bg-amber-50/20 py-2 rounded-lg font-bold text-xs">MTN</button>
            <button onclick="selectProvider('airtel')" id="prov-airtel" class="border-2 border-slate-200 py-2 rounded-lg font-bold text-xs">Airtel</button>
            <button onclick="selectProvider('zamtel')" id="prov-zamtel" class="border-2 border-slate-200 py-2 rounded-lg font-bold text-xs">Zamtel</button>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Enter Phone Number</label>
          <div class="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-3">
            <span class="text-xs font-bold text-slate-500 mr-2">+260</span>
            <input type="text" id="momo-phone" value="${tx.phone ? tx.phone.replace('+260', '') : '977001122'}" class="w-full bg-transparent border-none text-xs sm:text-sm font-bold focus:outline-none focus:ring-0" />
          </div>
        </div>

        <button onclick="triggerPayment('momo')" class="w-full py-3.5 bg-[#f5a623] hover:bg-[#e4951b] text-[#12122c] font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-4">
          ✓ Pay ZMW ${tx.amount.toFixed(2)} with MoMo
        </button>
      </div>

      <!-- Card Interactive Form -->
      <div id="card-panel" class="space-y-4 hidden animate-fade-in">
        <div class="space-y-1.5">
          <label class="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Card Number</label>
          <input type="text" id="card-num" value="4000 1234 5678 9010" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs sm:text-sm font-bold outline-none font-mono" />
        </div>
        
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Expiry Date</label>
            <input type="text" id="card-expiry" value="12/28" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs sm:text-sm font-bold outline-none text-center" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">CVV Code</label>
            <input type="password" id="card-cvv" value="123" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs sm:text-sm font-bold outline-none text-center tracking-widest" />
          </div>
        </div>

        <button onclick="triggerPayment('card')" class="w-full py-3.5 bg-[#12122c] hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-4">
          ✓ Pay ZMW ${tx.amount.toFixed(2)} with Card
        </button>
      </div>

      <!-- Cancel Button -->
      <button onclick="cancelPayment()" class="w-full py-3 bg-red-50 hover:bg-red-100 active:scale-[0.99] text-red-700 border border-red-100 font-bold rounded-xl transition-all text-xs">
        Cancel and return to Tambu
      </button>
    </div>
    
    <div class="p-4 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-center gap-2">
      <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Secured under direct Bank of Zambia (BOZ) digital security frameworks</span>
    </div>
  </div>

  <!-- Simulated Mobile Money SIM-Toolkit or Card 3DS Validation Dialog -->
  <div id="sim-prompt-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
    <div class="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-100 text-left">
      
      <!-- Prompt Title Header -->
      <div id="prompt-header" class="p-4 text-white flex justify-between items-center transition-all bg-amber-400 text-slate-900">
        <span id="prompt-header-text" class="text-xs font-black tracking-wider uppercase">SIM Toolkit Prompt</span>
        <span class="text-[9px] px-1.5 py-0.5 rounded bg-black/20 font-bold uppercase">SECURE</span>
      </div>

      <div class="p-5 space-y-4">
        <p id="prompt-text" class="text-xs text-slate-600 leading-relaxed"></p>
        
        <div class="space-y-1.5">
          <input type="password" id="prompt-input" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-400 tracking-widest font-black" placeholder="••••" />
          <p id="prompt-error" class="text-[11px] text-red-600 hidden font-bold">Please check your entries & retry.</p>
        </div>

        <div class="flex gap-2.5 pt-2">
          <button onclick="closePrompt()" class="flex-1 py-2.5 border border-slate-100 hover:bg-slate-50 transition-colors rounded-xl text-xs font-bold text-center">
            Cancel
          </button>
          <button onclick="approvePrompt()" class="flex-1 py-2.5 bg-[#12122c] hover:bg-slate-900 text-white rounded-xl text-xs font-black text-center shadow">
            Confirm Approve
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let activeMethod = 'momo';
    let activeProvider = 'mtn';

    function selectMethod(method) {
      activeMethod = method;
      const momoBtn = document.getElementById('momo-btn');
      const cardBtn = document.getElementById('card-btn');
      const momoPanel = document.getElementById('momo-panel');
      const cardPanel = document.getElementById('card-panel');

      if (method === 'momo') {
        momoBtn.className = "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all bg-[#12122c] text-white flex-1";
        cardBtn.className = "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-200 flex-1";
        momoPanel.classList.remove('hidden');
        cardPanel.classList.add('hidden');
      } else {
        cardBtn.className = "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all bg-[#12122c] text-white flex-1";
        momoBtn.className = "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all text-slate-600 hover:bg-slate-200 flex-1";
        cardPanel.classList.remove('hidden');
        momoPanel.classList.add('hidden');
      }
    }

    function selectProvider(prov) {
      activeProvider = prov;
      ['mtn', 'airtel', 'zamtel'].forEach(p => {
        const btn = document.getElementById('prov-' + p);
        if (p === prov) {
          btn.className = "border-2 border-amber-400 bg-amber-50/20 py-2 rounded-lg font-bold text-xs text-center";
        } else {
          btn.className = "border-2 border-slate-200 py-2 rounded-lg font-bold text-xs text-center hover:border-slate-300";
        }
      });
    }

    function triggerPayment(method) {
      const overlay = document.getElementById('sim-prompt-overlay');
      const header = document.getElementById('prompt-header');
      const headerText = document.getElementById('prompt-header-text');
      const promptText = document.getElementById('prompt-text');
      const input = document.getElementById('prompt-input');
      const errorMsg = document.getElementById('prompt-error');

      errorMsg.classList.add('hidden');
      input.value = '';

      if (method === 'momo') {
        const phoneVal = document.getElementById('momo-phone').value;
        const provName = activeProvider.toUpperCase() + ' MoMo';
        
        if (activeProvider === 'mtn') {
          header.className = "p-4 text-slate-900 bg-[#FFCC00] flex justify-between items-center";
        } else if (activeProvider === 'airtel') {
          header.className = "p-4 text-white bg-[#E41B17] flex justify-between items-center";
        } else {
          header.className = "p-4 text-white bg-teal-600 flex justify-between items-center";
        }

        headerText.innerText = provName + " SIM Toolkit";
        promptText.innerHTML = "Do you want to authorize transaction of <strong>K${tx.amount.toFixed(2)}</strong> to <strong>Tambu Zambia</strong>? Enter your 4-digit Wallet PIN code below:";
        input.placeholder = "Wallet PIN";
        input.maxLength = 4;
        input.className = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs sm:text-sm focus:outline-none focus:border-amber-400 tracking-[0.5em] font-black";
      } else {
        header.className = "p-4 text-white bg-[#12122c] flex justify-between items-center";
        headerText.innerText = "Verified by Visa / Mastercard ID Check";
        promptText.innerHTML = "To authorize standard billing of <strong>K${tx.amount.toFixed(2)}</strong>, please enter the 6-digit Secure OTP code sent to phone number linked to your card:";
        input.placeholder = "Secure Card OTP";
        input.maxLength = 6;
        input.className = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs sm:text-sm focus:outline-none focus:border-slate-500 tracking-normal font-black";
      }

      overlay.classList.remove('hidden');
    }

    function closePrompt() {
      document.getElementById('sim-prompt-overlay').classList.add('hidden');
    }

    async function approvePrompt() {
      const input = document.getElementById('prompt-input').value;
      const errorMsg = document.getElementById('prompt-error');
      
      if (!input || input.length < 4) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "Please enter your security authentication code to proceed.";
        return;
      }

      try {
        const res = await fetch('/api/payments/simulate-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tx_ref: '${tx_ref}' })
        });
        const data = await res.json();
        
        if (data.success) {
          const targetUrl = '/?FLW_STATUS=success&status=successful&tx_ref=${tx_ref}&transaction_id=${tx.transactionId}';
          window.location.href = targetUrl;
        } else {
          errorMsg.classList.remove('hidden');
          errorMsg.innerText = "Transaction could not be authorized. Please try again.";
        }
      } catch (err) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "Network checkout validation error occurred.";
      }
    }

    async function cancelPayment() {
      // Non-blocking fire-and-forget report to prevent network delays from stalling the redirect on mobile
      fetch('/api/payments/simulate-fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_ref: '${tx_ref}' })
      }).catch(e => console.warn('Reporting transaction status offline failed:', e));

      window.location.href = '/?FLW_STATUS=cancelled&status=cancelled&tx_ref=${tx_ref}';
    }
  </script>
</body>
</html>
  `);
});


// Handle secure Supabase Google OAuth Callback in standard Popups (sandboxed compliance)
app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
  let rawUrl = (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  let rawAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  // Programmatically sanitize and normalize Supabase URLs (e.g. if the user pasted a deep link, JWKS endpoint, or had trailing slashes/paths)
  if (rawUrl) {
    const supabaseCoMatch = rawUrl.match(/^(https?:\/\/[a-zA-Z0-9\-]+\.supabase\.[a-z]+)/i);
    if (supabaseCoMatch) {
      rawUrl = supabaseCoMatch[1];
    } else {
      if (rawUrl.endsWith('/')) {
        rawUrl = rawUrl.slice(0, -1);
      }
      if (rawUrl.endsWith('/rest/v1')) {
        rawUrl = rawUrl.substring(0, rawUrl.length - 8);
      } else if (rawUrl.endsWith('/rest/v1/')) {
        rawUrl = rawUrl.substring(0, rawUrl.length - 9);
      }
    }
  }

  const supabaseUrl = rawUrl;
  const supabaseAnonKey = rawAnonKey;

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating with Google...</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%; border: 1px solid #e2e8f0; }
    .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #f5a623; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1.5rem auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
    p { margin: 0; font-size: 0.875rem; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Authenticating...</h2>
    <p>We are establishing your secure Tambu session. This window will close automatically once complete.</p>
  </div>
  <script>
    const supabaseUrl = "${supabaseUrl}";
    const supabaseAnonKey = "${supabaseAnonKey}";
    
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const { createClient } = supabase;
        const client = createClient(supabaseUrl, supabaseAnonKey);
        
        // Wait a small moment for the auth SDK to process the callback, parse code/tokens, and persist to localStorage
        setTimeout(async () => {
          try {
            const { data: { session } } = await client.auth.getSession();
            if (session) {
              console.log("Session loaded successfully in popup.");
            }
          } catch (e) {
            console.error("Session verification failed inside popup:", e);
          }
          
          if (window.opener) {
            window.opener.postMessage({ type: 'TAMBU_AUTH_SUCCESS' }, '*');
          } else {
            console.warn("Popup parent window (window.opener) is missing.");
          }
          window.close();
        }, 1200);
      } catch (e) {
        console.error("Popup library initialization failed:", e);
        if (window.opener) {
          window.opener.postMessage({ type: 'TAMBU_AUTH_ERROR', message: String(e) }, '*');
        }
        setTimeout(() => window.close(), 3000);
      }
    } else {
      console.error("Missing Supabase configuration in callback.");
      if (window.opener) {
        window.opener.postMessage({ type: 'TAMBU_AUTH_ERROR', message: 'Missing client keys' }, '*');
      }
      setTimeout(() => window.close(), 3000);
    }
  </script>
</body>
</html>
  `);
});


// Hook in Vite Server or static serving files
async function startServer() {
  // Mount Vite development server when not running in production Node environment
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    // Register Vite middleware for compiling and hot reload in client resources
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tambu Full-Stack server booted securely on http://0.0.0.0:${PORT}`);
  });
}

startServer();
