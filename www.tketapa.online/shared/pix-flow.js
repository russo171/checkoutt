(function (global) {
  'use strict';

  var trackingKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];

  function read(storage, key) {
    try { return JSON.parse(storage.getItem(key) || '{}') || {}; }
    catch (_) { return {}; }
  }

  function write(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch (_) { }
  }

  function cleanPhone(value) {
    var phone = String(value || '').replace(/\D/g, '');
    return phone.length === 13 && phone.slice(0, 2) === '55' ? phone.slice(2) : phone;
  }

  function saveLead(input) {
    var current = Object.assign({}, read(localStorage, 'lead_data'), read(sessionStorage, 'lead_data'));
    var name = String(input.name || input.nome || input.fullName || current.name || current.nome || '').trim();
    var email = String(input.email || current.email || '').trim().toLowerCase();
    var phone = cleanPhone(input.phone || input.telefone || current.phone || current.telefone);
    var lead = { name: name, nome: name, fullName: name, email: email, phone: phone, telefone: phone };
    if (name || email || phone) {
      write(sessionStorage, 'lead_data', lead);
      write(localStorage, 'lead_data', lead);
    }
    return lead;
  }

  function loadLead() {
    var fromUrl = new URLSearchParams(global.location.search);
    var stored = Object.assign({}, read(localStorage, 'userPixData'), read(localStorage, 'lead_data'), read(sessionStorage, 'lead_data'));
    return saveLead({
      name: fromUrl.get('name') || fromUrl.get('nome') || stored.name || stored.nome || stored.fullName,
      email: fromUrl.get('email') || stored.email,
      phone: fromUrl.get('phone') || fromUrl.get('telefone') || stored.phone || stored.telefone,
    });
  }

  function validLead(lead) {
    return lead.name.length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) &&
      /^\d{10,11}$/.test(lead.phone);
  }

  function loadTracking() {
    var params = new URLSearchParams(global.location.search);
    var saved = Object.assign({}, read(localStorage, 'tracking_data'), read(sessionStorage, 'tracking_data'));
    var tracking = {};
    trackingKeys.forEach(function (key) {
      tracking[key] = params.get(key) || saved[key] || '';
    });
    write(sessionStorage, 'tracking_data', tracking);
    write(localStorage, 'tracking_data', tracking);
    return tracking;
  }

  function saveTransaction(data) {
    var id = data.id || data.transaction_id;
    if (!id) throw new Error('Transação PIX sem identificador.');
    var transaction = {
      id: id,
      transaction_id: id,
      qr_code: data.qr_code || '',
      qr_code_base64: data.qr_code_base64 || '',
      amount: data.amount,
      status: data.status || 'pending',
      offer: data.offer || 'checkout',
      tracking: loadTracking(),
    };
    write(sessionStorage, 'active_pix_transaction', transaction);
    write(localStorage, 'active_pix_transaction', transaction);
    return transaction;
  }

  function loadTransaction(id) {
    var tx = read(sessionStorage, 'active_pix_transaction');
    if (!tx.id) tx = read(localStorage, 'active_pix_transaction');
    if (id && String(tx.id || tx.transaction_id) !== String(id)) return {};
    return tx;
  }

  function paymentUrl(transaction, next) {
    var url = new URL('https://www.tketapa.online/pix/', global.location.origin);
    var tracking = loadTracking();
    trackingKeys.forEach(function (key) {
      if (tracking[key]) url.searchParams.set(key, tracking[key]);
    });
    url.searchParams.set('id', transaction.id);
    url.searchParams.set('next', next);
    // QR fica só no sessionStorage (saveTransaction) — na URL estoura limite no app do TikTok
    if (transaction.amount) url.searchParams.set('amount', transaction.amount);
    if (transaction.offer) url.searchParams.set('offer', transaction.offer);
    return url.toString();
  }

  global.pixFlow = { saveLead: saveLead, loadLead: loadLead, validLead: validLead,
    loadTracking: loadTracking, saveTransaction: saveTransaction,
    loadTransaction: loadTransaction, paymentUrl: paymentUrl };
})(window);
