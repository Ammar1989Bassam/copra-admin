// ═══════════════════════════════════════════════════
// COPRA — app.js
// All UI modules: nav, sales, inventory, wholesale, etc.
// ═══════════════════════════════════════════════════


function nav(page){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('pg-'+page)?.classList.add('active');
  document.querySelector(`.ni[data-page="${page}"]`)?.classList.add('active');
  if(page==='setup'){setTimeout(()=>{renderSetupUsers&&renderSetupUsers();renderSetupWCUsers&&renderSetupWCUsers();},50);}
  if(page==='handover'){populateSels();renderHandover&&renderHandover();return;}
  populateSels();
  ({dashboard:renderDash,sales:renderSales,colbatches:renderColBatches,inventory:renderInv,
    purchases:renderPur,wholesale:renderWholesale,customers:renderCusts,expenses:renderExp,
    payments:renderPay,products:renderProds,suppliers:renderSuppliers,vehicles:renderVehicles,financials:renderFinancials,assets:renderAssets}[page]||function(){})();
}

// ═══ POPULATE SELECTS ════════════════════════════════════════
function populateSels(){
  const pOpts='<option value="">— select —</option>'+DB.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  ['s-prod','r-prod','nb-prod','ac-prod','pu-prod'].forEach(id=>{const e=document.getElementById(id);if(e){const v=e.value;e.innerHTML=pOpts;e.value=v;}});
  // Customer datalist
  const dl=document.getElementById('dl-cust');
  if(dl){const ns=[...new Set(DB.sales.map(s=>s.customer_name||s.customer).filter(Boolean))];dl.innerHTML=ns.map(n=>`<option value="${n}">`).join('');}
  // WC select
  const wcSel=document.getElementById('s-wc-id');
  if(wcSel)wcSel.innerHTML='<option value="">— select —</option>'+DB.wholesale_customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  // WC stmt filter
  const stmtSel=document.getElementById('wc-stmt-sel');
  if(stmtSel){const cur=stmtSel.value;stmtSel.innerHTML='<option value="">Select customer…</option>'+DB.wholesale_customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');stmtSel.value=cur;}
  // Car makes (only from variants)
  const carMake=document.getElementById('s-car-make');
  if(carMake&&carMake.options.length<=1){carMake.innerHTML='<option value="">— any make —</option>'+getAllMakes().map(m=>`<option value="${m}">${m}</option>`).join('');}
  // Inv filters
  const ipf=document.getElementById('inv-prod-filter');
  if(ipf){const cur=ipf.value;ipf.innerHTML='<option value="">All Products</option>'+DB.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');ipf.value=cur;}
  // Collection batch selects
  const cbSel=document.getElementById('cb-assign-sel');
  if(cbSel){cbSel.innerHTML='<option value="">Select open batch…</option>'+DB.collection_batches.filter(b=>b.status==='Open').map(b=>`<option value="${b.id}">${b.batch_name}</option>`).join('');}
  // Add variant make (only known makes)
  const avMake=document.getElementById('av-make');
  if(avMake&&avMake.options.length<=1){avMake.innerHTML='<option value="">— none (accessory) —</option>'+getAllMakes().map(m=>`<option value="${m}">${m}</option>`).join('');}

  const _supOpts2='<option value="">— select —</option>'+(DB.suppliers||[]).map(s=>`<option value="${s.id}">${s.name} (${s.type})</option>`).join('');
  ['pu-supplier-id','sup-batch-sup-id'].forEach(id=>{const e=document.getElementById(id);if(e){const v=e.value;e.innerHTML=_supOpts2;e.value=v;}});
}

// ═══ DASHBOARD ═══════════════════════════════════════════════
function renderDash(){
  if(isAdmin()){renderReservations();var _pr=(DB.reservations||[]).filter(function(r){return r.status==='Pending';});var _pp=document.getElementById('dash-reservations-panel');var _pl=document.getElementById('dash-res-list');if(_pp){_pp.style.display=_pr.length?'block':'none';if(_pl&&_pr.length){_pl.innerHTML=_pr.slice(0,5).map(function(r){var wc=(DB.wholesale_customers||[]).find(function(c){return c.id===r.customer_id;});var p=gP(r.product_id);var v=gV(r.variant_id);return'<div style="padding:6px 0;border-bottom:1px solid var(--bd);display:flex;justify-content:space-between"><span><strong>'+(wc&&wc.name||r.customer_name||'?')+'</strong> - '+(p&&p.name||'?')+' '+(v?vLabel(v):'')+' x '+r.qty+'</span><span style="font-size:11px;color:var(--mu)">'+dF(r.date)+'</span></div>';}).join('')+(_pr.length>5?'<div style="font-size:11px;color:var(--mu);padding-top:6px">+'+(_pr.length-5)+' more</div>':'');}}}

  document.getElementById('dash-date').textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const sales=DB.sales.filter(s=>!isRet(s));
  const rev=sales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const cSales=sales.filter(s=>isColl(s.payment_status));
  const coll=cSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const cos=cSales.reduce((a,s)=>a+(+s.unit_cost_nis||0)*(+s.qty||1),0);
  const gp=coll-cos;
  const pnd=sales.filter(s=>!isColl(s.payment_status)).reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const overdue=DB.wholesale_customers.reduce((a,c)=>a+getWCOverdue(c.id),0);
  // Stock values
  const stkCost=DB.variants.reduce((a,v)=>a+getStock(v.id)*getFifoCost(v.id),0);
  const stkRetail=DB.variants.reduce((a,v)=>a+getStock(v.id)*(+v.retail||0),0);
  const rets=DB.sales.filter(isRet).length;
  document.getElementById('kpi-grid').innerHTML=[
    {l:'Cash Collected',v:nisF(coll),s:pctF(coll/(rev||1))+' of invoiced',c:'gold'},
    {l:'Gross Profit',v:nisF(gp),s:pctF(gp/(coll||1))+' margin (FIFO)',c:'green'},
    {l:'Pending Collection',v:nisF(pnd),s:sales.filter(s=>!isColl(s.payment_status)).length+' invoices',c:'red'},
    {l:'Overdue (WC)',v:nisF(overdue),s:'Past credit terms',c:'purple'},
    {l:'Stock Value (Cost)',v:nisF(stkCost),s:'FIFO cost',c:'blue'},
    {l:'Stock Value (Retail)',v:nisF(stkRetail),s:'If sold at retail',c:'cyan'},
    {l:'Total Invoiced',v:nisF(rev),s:sales.length+' transactions',c:''},
    {l:'Returns',v:rets,s:'Units returned',c:''},
  ].map(k=>`<div class="kc ${k.c}"><div class="kl">${k.l}</div><div class="kv">${k.v}</div><div class="ks">${k.s}</div></div>`).join('');
  // Product revenue chart
  const byP={};sales.forEach(s=>{const n=pN(s.product_id)||'Other';byP[n]=(byP[n]||0)+(+s.unit_price||0)*(+s.qty||1);});
  const sp=Object.entries(byP).sort((a,b)=>b[1]-a[1]).slice(0,8);const mx=sp[0]?.[1]||1;
  document.getElementById('chart-prod').innerHTML=sp.map(([n,v])=>`<div class="br-row"><div class="br-lbl" title="${n}">${n}</div><div class="br-trk"><div class="br-fil" style="width:${(v/mx*100).toFixed(1)}%"></div></div><div class="br-val">${nisF(v)}</div></div>`).join('');
  // Mix
  const rt=sales.filter(s=>s.sale_type==='Retail').reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const wh=sales.filter(s=>s.sale_type==='Wholesale').reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const tt=rt+wh||1;
  document.getElementById('chart-mix').innerHTML=[
    ['🏪 Retail',rt,tt,'var(--gd)'],['🏭 Wholesale',wh,tt,'var(--nv)']
  ].map(([lbl,v,tot,col])=>`<div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:600;font-size:12px">${lbl}</span><span style="font-weight:700;font-size:12px">${nisF(v)} (${(v/tot*100).toFixed(0)}%)</span></div>
    <div class="br-trk" style="height:11px;border-radius:6px"><div class="br-fil" style="width:${(v/tot*100).toFixed(1)}%;height:100%;background:${col};border-radius:6px"></div></div>
    <div style="font-size:10px;color:var(--mu);margin-top:2px">${DB.sales.filter(s=>!isRet(s)&&s.sale_type===(lbl.includes('Retail')?'Retail':'Wholesale')).length} transactions</div>
  </div>`).join('');
  // Low stock
  const low=DB.variants.map(v=>({...v,stk:getStock(v.id),prod:gP(v.product_id)})).filter(v=>v.stk<=(+(v.prod?.alert_qty||5))).sort((a,b)=>a.stk-b.stk).slice(0,10);
  document.getElementById('low-tbl').innerHTML=low.length?tbl(low.map(v=>({'Product':v.prod?.name||'—','Variant':vLabel(v),'In Stock':`<span class="b ${v.stk===0?'br':'bo'}">${v.stk}</span>`,'FIFO Cost':nisF(getFifoCost(v.id))}))):
    '<div style="padding:14px;text-align:center;color:var(--gn);font-size:12px">✅ All adequately stocked</div>';
  // Overdue
  const odR=DB.wholesale_customers.map(c=>({c,b:getWCBal(c.id),od:getWCOverdue(c.id)})).filter(x=>x.od>0);
  document.getElementById('overdue-tbl').innerHTML=odR.length?tbl(odR.map(x=>({'Customer':x.c.name,'Balance':nisF(x.b),'Overdue':`<span class="aneg">${nisF(x.od)}</span>`,'Limit':nisF(+x.c.credit_limit_nis||0)}))):
    '<div style="padding:14px;text-align:center;color:var(--gn);font-size:12px">✅ No overdue receivables</div>';
  // Recent
  const rec=[...DB.sales].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
  document.getElementById('recent-tbl').innerHTML=tbl(rec.map(s=>{
    const ret=isRet(s);const tot=(+s.unit_price||0)*(+s.qty||1);
    return{_id:s.id,'Date':dF(s.date),'Product':ret?'<span class="b br">↩ Return</span>':(pN(s.product_id)||'—'),
      'Variant':s.variant_label||'—','Customer':s.customer_name||s.customer||'—',
      'Amount':ret?`<span class="aneg">${nisF(tot)}</span>`:nisF(tot),
      'Type':ptBadge(s.payment_type),'Status':pBadge(s.payment_status),
      '_actions':`<button class="btn btn-s btn-sm" onclick="openEditSale('${s.id}')">✏️</button>`};
  }),true);
}

// ═══ SALES ═══════════════════════════════════════════════════
function openSale(type){
  // Set type
  const typeEl=document.getElementById('s-type');
  if(typeEl)typeEl.value=type;
  // Badge
  const badge=document.getElementById('s-type-badge');
  if(badge){
    badge.textContent=type==='Retail'?'🏪 Retail':'🏭 Wholesale';
    badge.style.background=type==='Retail'?'#1A8C5B':'#1B2A4A';
    badge.style.color='#fff';
  }
  // Customer fields
  const wcWrap=document.getElementById('s-wc-wrap');
  const custWrap=document.getElementById('s-cust-wrap');
  if(wcWrap)wcWrap.style.display=type==='Wholesale'?'':'none';
  if(custWrap)custWrap.style.display=type==='Retail'?'':'none';
  // Payment type options
  const pt=document.getElementById('s-paytype');
  if(pt){
    if(type==='Retail'){
      pt.innerHTML='<option value="Cash">Cash — collected immediately ✅</option><option value="COD">Cash on Delivery (COD)</option>';
      pt.value='Cash';
    } else {
      pt.innerHTML='<option value="Credit">Credit — collected via account</option>';
      pt.value='Credit';
    }
  }
  // Reset fields
  const d=tod();
  document.getElementById('s-date').value=d;
  ['s-cust','s-stock-info','s-cost','s-rmk'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('s-qty').value=1;
  document.getElementById('s-disc').value=0;
  document.getElementById('s-price').value='';
  document.getElementById('s-floor-warn').style.display='none';
  document.getElementById('s-gp-preview').style.display='none';
  // Populate makes
  const makes=[...new Set(DB.variants.filter(v=>v.car_make).map(v=>v.car_make))].sort();
  const makeEl=document.getElementById('s-car-make');
  if(makeEl)makeEl.innerHTML='<option value="">— any make —</option>'+makes.map(m=>`<option value="${m}">${m}</option>`).join('');
  document.getElementById('s-car-model').innerHTML='<option value="">— any model —</option>';
  document.getElementById('s-car-year').value='';
  document.getElementById('s-compat-prods').innerHTML='<option value="">— select —</option>';
  // Populate products
  const pSel=document.getElementById('s-prod');
  if(pSel)pSel.innerHTML='<option value="">— select —</option>'+DB.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  document.getElementById('s-variant').innerHTML='<option value="">— select product first —</option>';
  // Populate WC customers
  const wcSel=document.getElementById('s-wc-id');
  if(wcSel)wcSel.innerHTML='<option value="">— select —</option>'+DB.wholesale_customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('s-wc-info').textContent='';
  // Show paytype buttons for retail, hide for wholesale
  const ptWrap=document.getElementById('s-paytype-wrap');
  if(ptWrap)ptWrap.style.display=type==='Retail'?'':'none';
  if(type==='Retail')setSalePayType('Cash');
  onPayTypeChange();
  openM('m-sale');
}
function onSaleTypeChange(){
  const isWS=document.getElementById('s-type').value==='Wholesale';
  document.getElementById('s-wc-wrap').style.display=isWS?'grid':'none';
  document.getElementById('s-cust-wrap').style.display=isWS?'none':'grid';
  const cOpt=document.querySelector('#s-paytype option[value="Credit"]');
  if(cOpt)cOpt.disabled=!isWS;
  if(!isWS&&document.getElementById('s-paytype').value==='Credit')document.getElementById('s-paytype').value='Cash';
  onPayTypeChange();
}
function onWCSelect(){
  const id=document.getElementById('s-wc-id').value;
  const el=document.getElementById('s-wc-info');if(!el)return;
  if(!id){el.textContent='';return;}
  const wc=gWC(id);if(!wc)return;
  const bal=getWCBal(id),lim=+wc.credit_limit_nis||0,avail=lim-bal;
  el.innerHTML=`Balance: <strong>${nisF(bal)}</strong> / Limit: <strong>${nisF(lim)}</strong> / Available: <strong class="${avail>0?'apos':'aneg'}">${nisF(avail)}</strong> · Disc: ${+wc.discount_pct||0}%`;
  // Refresh price with customer discount
  const vid=document.getElementById('s-variant').value;
  if(vid)onVariantSelect();
}
function onSaleProdChange(){
  const pid=document.getElementById('s-prod').value;
  const vSel=document.getElementById('s-variant');
  vSel.innerHTML='<option value="">— select variant —</option>';
  if(!pid){document.getElementById('s-stock-info').value='';return;}
  DB.variants.filter(v=>v.product_id===pid).forEach(v=>{
    const stk=getStock(v.id);
    const o=document.createElement('option');o.value=v.id;
    o.textContent=vLabel(v)+' | Stock: '+stk+' | ₪'+v.retail;
    vSel.appendChild(o);
  });
  // Sync car make dropdown to only show makes for this product
  const carMake=document.getElementById('s-car-make');
  if(carMake){
    const makes=getMakesForProduct(pid);
    carMake.innerHTML='<option value="">— any make —</option>'+makes.map(m=>`<option value="${m}">${m}</option>`).join('');
  }
  onVariantSelect();
}
function onVariantSelect(){
  const vid=document.getElementById('s-variant').value;
  if(!vid){document.getElementById('s-stock-info').value='';document.getElementById('s-cost').value='';updateSalePreview();return;}
  const v=gV(vid);if(!v)return;
  const stk=getStock(vid);const cost=getFifoCost(vid);
  document.getElementById('s-stock-info').value=`${stk} units · FIFO cost: ${nisF(cost)}`;
  document.getElementById('s-cost').value=cost.toFixed(2);
  const type=(document.getElementById('s-type')?.value)||'Retail';
  const isWS=type==='Wholesale';
  const pe=document.getElementById('s-price');
  if(isWS){
    // Apply customer discount if any
    const wcId=document.getElementById('s-wc-id')?.value;
    const wc=wcId?gWC(wcId):null;
    const disc=wc?(+wc.discount_pct||0):0;
    pe.value=((+v.wholesale||0)*(1-disc/100)).toFixed(2);
    pe.readOnly=true;
    pe.style.background='var(--bg)';
    pe.style.color='var(--mu)';
    document.getElementById('s-disc').value=disc;
    document.getElementById('s-disc').disabled=true;
  } else {
    pe.value=(+v.retail||0).toFixed(2);
    pe.readOnly=false;
    pe.style.background='';
    pe.style.color='';
    document.getElementById('s-disc').disabled=false;
  }
  checkFloor();updateSalePreview();
}
function onCarMakeChange(){
  const make=document.getElementById('s-car-make').value;
  const mSel=document.getElementById('s-car-model');
  mSel.innerHTML='<option value="">— any model —</option>';
  if(make)getModelsForMake(make).forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;mSel.appendChild(o);});
  document.getElementById('s-car-year').value='';
  document.getElementById('s-compat-prods').innerHTML='<option value="">— select —</option>';
}
function onCarModelChange(){updateCompatProducts();}
function onCarYearChange(){updateCompatProducts();}
function updateCompatProducts(){
  const make=document.getElementById('s-car-make').value;
  const model=document.getElementById('s-car-model').value;
  const year=document.getElementById('s-car-year').value;
  const cpSel=document.getElementById('s-compat-prods');
  cpSel.innerHTML='<option value="">— select —</option>';
  if(!make||!model)return;
  const variants=getCompatibleVariants(make,model,year);
  if(!variants.length){cpSel.innerHTML='<option value="">No compatible products found</option>';return;}
  variants.forEach(v=>{
    const p=gP(v.product_id);const stk=getStock(v.id);
    const o=document.createElement('option');o.value=v.id;
    o.textContent=`${p?p.name:'?'} · ${v.set_type||'—'} · ₪${v.retail} · Stock: ${stk}`;
    cpSel.appendChild(o);
  });
}
function onCompatProdSelect(){
  const vid=document.getElementById('s-compat-prods').value;if(!vid)return;
  const v=gV(vid);if(!v)return;
  // Auto-fill product and variant
  const pSel=document.getElementById('s-prod');pSel.value=v.product_id;onSaleProdChange();
  setTimeout(()=>{document.getElementById('s-variant').value=vid;onVariantSelect();},50);
}
function applyDiscount(){
  const vid=document.getElementById('s-variant').value;if(!vid)return;
  const v=gV(vid);if(!v)return;
  const d=+(document.getElementById('s-disc').value||0);
  const isWS=document.getElementById('s-type').value==='Wholesale';
  document.getElementById('s-price').value=((isWS?(+v.wholesale||0):(+v.retail||0))*(1-d/100)).toFixed(2);
  checkFloor();updateSalePreview();
}
function checkFloor(){
  const vid=document.getElementById('s-variant').value;
  const warn=document.getElementById('s-floor-warn');
  if(!vid||!warn){if(warn)warn.style.display='none';return;}
  const v=gV(vid);if(!v){warn.style.display='none';return;}
  const price=+(document.getElementById('s-price').value||0);
  const cost=getFifoCost(vid);
  const floor=cost*(1+(+v.min_margin_pct||15)/100);
  warn.style.display=(price>0&&price<floor)?'block':'none';
  updateSalePreview();
}
function updateSalePreview(){
  const vid=document.getElementById('s-variant').value;
  const prev=document.getElementById('s-gp-preview');
  if(!vid||!prev){if(prev)prev.style.display='none';return;}
  const qty=+(document.getElementById('s-qty').value||1);
  const price=+(document.getElementById('s-price').value||0);
  const cost=getFifoCost(vid);
  if(!price){prev.style.display='none';return;}
  const total=price*qty,totalCost=cost*qty,gp=total-totalCost;
  prev.style.display='block';
  document.getElementById('s-prev-total').textContent=nisF(total);
  document.getElementById('s-prev-cost').textContent=nisF(totalCost);
  const gpEl=document.getElementById('s-prev-gp');gpEl.textContent=nisF(gp);gpEl.className=gp>=0?'apos':'aneg';
  const mEl=document.getElementById('s-prev-margin');mEl.textContent=pctF(gp/(total||1));mEl.className=gp>=0?'apos':'aneg';
}
function onPayTypeChange(){
  const type=(document.getElementById('s-type')?.value)||'Retail';
  const pt=(document.getElementById('s-paytype')?.value)||'Cash';
  const pstatWrap=document.getElementById('s-pstat-wrap');
  const colWrap=document.getElementById('s-colldate-wrap');
  const pstatHidden=document.getElementById('s-pstat');
  const pstatDisplay=document.getElementById('s-pstat-display');

  if(type==='Retail'){
    if(pt==='Cash'){
      // Cash: status = Collected, hide status + colldate
      if(pstatHidden)pstatHidden.value='Collected';
      if(pstatDisplay)pstatDisplay.value='Collected (auto)';
      if(pstatWrap)pstatWrap.style.display='none';
      if(colWrap)colWrap.style.display='none';
    } else {
      // COD: status = Pending (locked), colldate disabled
      if(pstatHidden)pstatHidden.value='Pending';
      if(pstatDisplay)pstatDisplay.value='Pending — collected via Collection Batches';
      if(pstatWrap)pstatWrap.style.display='';
      if(colWrap)colWrap.style.display='none';
    }
  } else {
    // Wholesale: always Pending, always locked
    if(pstatHidden)pstatHidden.value='Pending';
    if(pstatDisplay)pstatDisplay.value='Pending — collected via customer account';
    if(pstatWrap)pstatWrap.style.display='';
    if(colWrap)colWrap.style.display='none';
  }
}
async function addSale(){
  const vid=document.getElementById('s-variant').value;
  const qty=+(document.getElementById('s-qty').value||1);
  const price=+(document.getElementById('s-price').value||0);
  const saleType=document.getElementById('s-type').value;
  const payType=document.getElementById('s-paytype').value;
  const isWS=saleType==='Wholesale';
  const v=gV(vid);if(!vid||!price||!v){alert('Select a variant and enter price.');return;}
  if(getStock(vid)<qty){alert(`Only ${getStock(vid)} units in stock for this variant.`);return;}
  let custId='',custName='';
  if(isWS){
    custId=document.getElementById('s-wc-id').value;
    if(!custId){alert('Select a wholesale customer.');return;}
    const wc=gWC(custId);custName=wc?wc.name:'';
    if(payType==='Credit'){
      const bal=getWCBal(custId),lim=+wc.credit_limit_nis||0,tot=price*qty;
      if(bal+tot>lim){alert(`⛔ CREDIT LIMIT EXCEEDED\n\n${custName}\nBalance: ${nisF(bal)}\nThis sale: ${nisF(tot)}\nLimit: ${nisF(lim)}\nOver by: ${nisF(bal+tot-lim)}\n\nCustomer must settle balance first.`);return;}
    }
  } else {custName=document.getElementById('s-cust').value;}
  const cost=getFifoCost(vid);
  const floor=cost*(1+(+v.min_margin_pct||15)/100);
  if(price>0&&price<floor&&!confirm(`⚠️ Price ${nisF(price)} below minimum floor ${nisF(floor)}. Proceed?`))return;
  const fifoUnit=await fifoDeduct(vid,qty);
  const payStatus=document.getElementById('s-pstat')?.value||'Pending';
  const p=gP(v.product_id);
  const row={id:uid(),date:document.getElementById('s-date').value||tod(),customer_id:custId,customer_name:custName,
    product_id:v.product_id,product_name:p?p.name:'',variant_id:vid,variant_label:vLabel(v),
    batch_id:getActiveBatches(vid)[0]?.id||'',qty,unit_price:price,unit_cost_nis:+fifoUnit.toFixed(4),
    discount_pct:+(document.getElementById('s-disc').value||0),payment_type:payType,payment_status:payStatus,
    collection_batch_id:'',collection_date:'',sale_type:saleType,
    car_make:v.car_make||'',car_model:v.car_model||'',year_from:v.year_from||'',year_to:v.year_to||'',
    set_type:v.set_type||'',remark:document.getElementById('s-rmk').value||'',
    gp_nis:+((price-fifoUnit)*qty).toFixed(2),is_return:false};
  DB.sales.push(row);await dbInsert('sales',row);
  closeM('m-sale');
  ['s-price','s-disc','s-rmk','s-cust','s-stock-info','s-cost'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('s-qty').value=1;
  document.getElementById('s-gp-preview').style.display='none';
  renderSales();renderDash();
}
async function addReturn(){
  const vid=document.getElementById('r-variant').value;
  const qty=+(document.getElementById('r-qty').value||1);
  const amt=+(document.getElementById('r-amt').value||0);
  const cust=document.getElementById('r-cust').value;
  if(!cust){alert('Enter customer name.');return;}
  if(qty<1){alert('Enter a valid quantity.');return;}
  if(vid)await fifoRestore(vid,qty);
  const v=gV(vid);const p=v?gP(v.product_id):null;
  const row={id:uid(),date:document.getElementById('r-date').value||tod(),customer_id:'',customer_name:cust,
    product_id:v?.product_id||'',product_name:p?.name||'',variant_id:vid||'',variant_label:vLabel(v)||'',
    batch_id:'',qty,unit_price:-amt,unit_cost_nis:0,discount_pct:0,payment_type:'Cash',payment_status:'Returned',
    collection_batch_id:'',collection_date:null,sale_type:'Return',
    car_make:v?.car_make||'',car_model:v?.car_model||'',year_from:null,year_to:null,set_type:v?.set_type||'',
    remark:'Return: '+document.getElementById('r-reason').value,gp_nis:0,is_return:true};
  DB.sales.push(row);
  await dbInsert('sales',row);
  closeM('m-return');renderSales();renderDash();
}
function onReturnProdChange(){
  const pid=document.getElementById('r-prod').value;
  const vSel=document.getElementById('r-variant');
  vSel.innerHTML='<option value="">—</option>'+DB.variants.filter(v=>v.product_id===pid).map(v=>`<option value="${v.id}">${vLabel(v)}</option>`).join('');
}
function renderSales(){
  const q=(document.getElementById('sf-q')?.value||'').toLowerCase();
  const ft=document.getElementById('sf-type')?.value||'';
  const fpt=document.getElementById('sf-ptype')?.value||'';
  const fst=document.getElementById('sf-status')?.value||'';
  const fr=document.getElementById('sf-from')?.value||'';
  const to=document.getElementById('sf-to')?.value||'';
  let list=[...DB.sales].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  if(q)list=list.filter(s=>(s.customer_name||s.customer||'').toLowerCase().includes(q)||(pN(s.product_id)||'').toLowerCase().includes(q)||(s.variant_label||'').toLowerCase().includes(q)||(s.car_model||'').toLowerCase().includes(q));
  if(ft==='Return')list=list.filter(isRet);
  else if(ft)list=list.filter(s=>s.sale_type===ft&&!isRet(s));
  if(fpt)list=list.filter(s=>s.payment_type===fpt);
  if(fst)list=list.filter(s=>(s.payment_status||'').toLowerCase().includes(fst.toLowerCase()));
  if(fr)list=list.filter(s=>String(s.date)>=fr);
  if(to)list=list.filter(s=>String(s.date)<=to);
  const nr=list.filter(s=>!isRet(s));
  const rev=nr.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const col=nr.filter(s=>isColl(s.payment_status)).reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const gp=nr.filter(s=>isColl(s.payment_status)).reduce((a,s)=>a+((+s.unit_price||0)-(+s.unit_cost_nis||0))*(+s.qty||1),0);
  document.getElementById('sc-lbl').textContent=list.length+' transactions';
  document.getElementById('sr-lbl').textContent=nisF(rev);
  document.getElementById('sc2-lbl').textContent=nisF(col);
  document.getElementById('sg-lbl').textContent=nisF(gp)+' ('+pctF(gp/(col||1))+')';
  document.getElementById('sales-tbl').innerHTML=tbl(list.map(s=>{
    const ret=isRet(s);const tot=(+s.unit_price||0)*(+s.qty||1);
    const gpR=((+s.unit_price||0)-(+s.unit_cost_nis||0))*(+s.qty||1);
    return{_id:s.id,'Date':dF(s.date),'Product':ret?'<span class="b br">↩</span>':(pN(s.product_id)||'—'),
      'Variant':s.variant_label||'—','Customer':s.customer_name||s.customer||'—','Qty':s.qty||1,
      'Price':ret?`<span class="aneg">${nisF(tot)}</span>`:nisF(tot),
      'GP':isAdmin()?(ret?'—':`<span class="${gpR>=0?'apos':'aneg'}">${nisF(gpR)}</span>`):'—',
      'GP%':ret||!+s.unit_price?'—':pctF(((+s.unit_price||0)-(+s.unit_cost_nis||0))/(+s.unit_price||1)),
      'Type':`<span class="b ${s.sale_type==='Wholesale'?'bb':ret?'br':'bg'}">${ret?'Return':s.sale_type||'Retail'}</span>`,
      'Pay':ptBadge(s.payment_type),'Status':pBadge(s.payment_status),
      'Coll.Date':s.collection_date?dF(s.collection_date):'—',
      '_actions':`<button class="btn btn-s btn-sm" onclick="openEditSale('${s.id}')">✏️</button>`};
  }),true);
}
function clearSF(){['sf-q','sf-from','sf-to'].forEach(id=>document.getElementById(id).value='');['sf-type','sf-ptype','sf-status'].forEach(id=>document.getElementById(id).value='');renderSales();}
function openEditSale(id){
  const s=DB.sales.find(x=>x.id===id);if(!s)return;
  document.getElementById('es-id').value=s.id;
  document.getElementById('es-date').value=s.date||'';
  document.getElementById('es-cust').value=s.customer_name||s.customer||'';
  document.getElementById('es-qty').value=s.qty||1;
  document.getElementById('es-price').value=s.unit_price||0;
  document.getElementById('es-paytype').value=s.payment_type||'Cash';
  document.getElementById('es-pstat').value=isColl(s.payment_status)?'Collected':s.payment_status||'Pending';
  document.getElementById('es-colldate').value=s.collection_date||'';
  document.getElementById('es-type').value=s.sale_type||'Retail';
  document.getElementById('es-rmk').value=s.remark||'';
  openM('m-edit-sale');
}
function saveEditSale(){
  const id=document.getElementById('es-id').value;
  const idx=DB.sales.findIndex(x=>x.id===id);if(idx===-1)return;
  const s=DB.sales[idx];
  s.date=document.getElementById('es-date').value;
  s.customer_name=document.getElementById('es-cust').value;
  s.qty=+(document.getElementById('es-qty').value||1);
  s.unit_price=+(document.getElementById('es-price').value||0);
  s.payment_type=document.getElementById('es-paytype').value;
  s.payment_status=document.getElementById('es-pstat').value;
  s.collection_date=document.getElementById('es-colldate').value||'';
  s.sale_type=document.getElementById('es-type').value;
  s.remark=document.getElementById('es-rmk').value;
  DB.sales[idx]=s;
  dbUpdate('sales', s.id, s);
  closeM('m-edit-sale');renderSales();renderDash();
}
function deleteSale(){
  const id=document.getElementById('es-id').value;
  const s=DB.sales.find(x=>x.id===id);
  if(!s||!confirm('Delete this sale? Stock will be restored.'))return;
  if(!isRet(s)&&s.variant_id)fifoRestore(s.variant_id,+s.qty||1);
  DB.sales=DB.sales.filter(x=>x.id!==id);
  dbDelete('sales', id);
  closeM('m-edit-sale');renderSales();renderDash();
}

// ═══ COLLECTION BATCHES ══════════════════════════════════════
function updateCBSum(){
  const checks=[...document.querySelectorAll('.cb-check:checked')];
  const total=checks.reduce((a,c)=>a+parseFloat(c.dataset.amt||0),0);
  const cnt=document.getElementById('cb-sum-count');
  const tot=document.getElementById('cb-sum-total');
  if(cnt)cnt.textContent=checks.length;
  if(tot)tot.textContent=nisF(total);
}
function viewBatchInvoices(batchId){
  const b=DB.collection_batches.find(x=>x.id===batchId);if(!b)return;
  const sales=DB.sales.filter(s=>s.collection_batch_id===batchId&&!isRet(s));
  const total=sales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  document.getElementById('cb-inv-title').textContent=`Invoices in: ${b.batch_name}`;
  document.getElementById('cb-inv-summary').innerHTML=
    `<span>Status: <strong class="b ${b.status==='Open'?'bo':'bg'}">${b.status}</strong></span>
     <span>Date: <strong>${b.collection_date?dF(b.collection_date):'—'}</strong></span>
     ${b.barcode?`<span>Barcode: <strong>${b.barcode}</strong></span>`:''}
     <span>Invoices: <strong>${sales.length}</strong></span>
     <span>Total: <strong style="color:var(--gn)">${nisF(total)}</strong></span>`;
  if(!sales.length){
    document.getElementById('cb-inv-tbl').innerHTML='<div style="padding:14px;text-align:center;color:var(--mu);font-size:12px">No invoices in this batch yet.</div>';
  } else {
    document.getElementById('cb-inv-tbl').innerHTML=tbl(
      sales.sort((a,c)=>String(a.date).localeCompare(String(c.date))).map(s=>({
        'Date':dF(s.date),
        'Customer':s.customer_name||s.customer||'—',
        'Product':pN(s.product_id)||'—',
        'Variant':s.variant_label||'—',
        'Amount':nisF((+s.unit_price||0)*(+s.qty||1)),
        'Status':pBadge(s.payment_status),
        'Coll. Date':s.collection_date?dF(s.collection_date):'—'
      })),false
    );
  }
  openM('m-cb-invoices');
}
function openEditBatch(id){
  const b=DB.collection_batches.find(x=>x.id===id);if(!b)return;
  document.getElementById('cb-modal-title').textContent='Edit Collection Batch';
  document.getElementById('cb-edit-id').value=id;
  document.getElementById('cb-name').value=b.batch_name||'';
  document.getElementById('cb-date').value=b.collection_date||'';
  document.getElementById('cb-barcode').value=b.barcode||'';
  document.getElementById('cb-notes').value=b.notes||'';
  openM('m-newcb');
}
function openNewColBatch(){
  document.getElementById('cb-modal-title').textContent='New Collection Run';
  document.getElementById('cb-edit-id').value='';
  ['cb-name','cb-barcode','cb-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('cb-date').value=tod();
  openM('m-newcb');
}
function saveColBatch(){
  const name=document.getElementById('cb-name').value.trim();
  if(!name){alert('Enter batch name.');return;}
  const editId=document.getElementById('cb-edit-id').value;
  if(editId){
    // Edit existing
    const b=DB.collection_batches.find(x=>x.id===editId);if(!b)return;
    b.batch_name=name;
    b.collection_date=document.getElementById('cb-date').value;
    b.barcode=document.getElementById('cb-barcode').value;
    b.notes=document.getElementById('cb-notes').value;
    dbUpdate('collection_batches', b.id, b);
  } else {
    // New batch
    const row={id:uid(),batch_name:name,collection_date:document.getElementById('cb-date').value,
      barcode:document.getElementById('cb-barcode').value,notes:document.getElementById('cb-notes').value,
      total_amount:0,invoice_count:0,status:'Open'};
    DB.collection_batches.push(row);
    dbInsert('collection_batches', row);
  }
  closeM('m-newcb');renderColBatches();
}
function closeBatch(batchId){
  const b=DB.collection_batches.find(x=>x.id===batchId);if(!b)return;
  // Find ALL sales assigned to this batch that are still pending
  const assigned=DB.sales.filter(s=>s.collection_batch_id===batchId&&!isRet(s));
  const pending=assigned.filter(s=>!isColl(s.payment_status));
  if(!assigned.length){
    if(!confirm(`Close "${b.batch_name}" with no invoices?\nYou can still use it as a reference record.`))return;
    b.status='Closed';b.total_amount=0;b.invoice_count=0;
    dbUpdate('collection_batches', b.id, b);
    renderColBatches();return;
  }
  const collDate=b.collection_date||tod();
  if(!confirm(`Close "${b.batch_name}"?\n\n${pending.length} invoices will be marked Collected on ${dF(collDate)}.\nTotal: ${nisF(assigned.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0))}`))return;
  let total=0;
  assigned.forEach(s=>{
    s.payment_status='Collected';
    s.collection_date=collDate;
    total+=(+s.unit_price||0)*(+s.qty||1);
    dbUpdate('sales', s.id, s);
  });
  b.status='Closed';b.total_amount=total;b.invoice_count=assigned.length;
  dbUpdate('collection_batches', b.id, b);
  renderColBatches();renderSales();renderDash();
}
function renderColBatches(){
  // ── COD BATCHES ──────────────────────────────────────────────
  const allCOD=[...DB.collection_batches].sort((a,b)=>String(b.collection_date||'').localeCompare(String(a.collection_date||'')));
  const openCOD=allCOD.filter(b=>b.status==='Open');
  const closedCOD=allCOD.filter(b=>b.status!=='Open');

  const cardsEl=document.getElementById('cb-cards');
  if(cardsEl){
    // Active batches as cards
    if(!openCOD.length){
      cardsEl.innerHTML='<div style="font-size:12px;color:var(--mu);padding:8px 0">No open COD batches. Create one to start collecting.</div>';
    } else {
      cardsEl.innerHTML=openCOD.map(b=>{
        const bSales=DB.sales.filter(s=>s.collection_batch_id===b.id&&!isRet(s));
        const bTotal=bSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
        return`<div class="kc" style="border-top:3px solid var(--gd)">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:7px">
            <div>
              <div style="font-weight:700;font-size:14px">${b.batch_name}</div>
              <div style="font-size:11px;color:var(--mu)">${b.collection_date?dF(b.collection_date):'No date'}${b.barcode?' · '+b.barcode:''}</div>
            </div>
            <span class="b bo">Open</span>
          </div>
          <div style="font-size:12px;margin-bottom:9px;display:flex;gap:14px">
            <span>Invoices: <strong>${bSales.length}</strong></span>
            <span>Total: <strong>${nisF(bTotal)}</strong></span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-s btn-sm" onclick="viewBatchInvoices('${b.id}')">📋 View</button>
            <button class="btn btn-s btn-sm" onclick="openEditBatch('${b.id}')">✏️ Edit</button>
            <button class="btn btn-p btn-sm" onclick="closeBatch('${b.id}')">✅ Close</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Closed batches history table
  const histEl=document.getElementById('cb-history-tbl');
  const histSearch=document.getElementById('cb-hist-search')?.value?.toLowerCase()||'';
  if(histEl){
    const filtered=closedCOD.filter(b=>
      !histSearch||
      (b.batch_name||'').toLowerCase().includes(histSearch)||
      (b.barcode||'').toLowerCase().includes(histSearch)||
      (b.collection_date||'').includes(histSearch)
    );
    if(!filtered.length){
      histEl.innerHTML='<div style="padding:16px;text-align:center;color:var(--mu);font-size:12px">'+(closedCOD.length?'No results for "'+histSearch+'"':'No closed batches yet.')+'</div>';
    } else {
      histEl.innerHTML='<div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Batch Name</th><th>Barcode</th><th>Invoices</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>'+
        filtered.map(b=>{
          const bSales=DB.sales.filter(s=>s.collection_batch_id===b.id&&!isRet(s));
          const bTotal=bSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
          return`<tr>
            <td>${b.collection_date?dF(b.collection_date):'—'}</td>
            <td><strong>${b.batch_name}</strong></td>
            <td style="font-size:11px;color:var(--mu)">${b.barcode||'—'}</td>
            <td>${bSales.length}</td>
            <td>${nisF(bTotal)}</td>
            <td><span class="b bg">Closed</span></td>
            <td><button class="btn btn-s btn-sm" onclick="viewBatchInvoices('${b.id}')">📋 View</button></td>
          </tr>`;
        }).join('')
        +'</tbody></table></div>';
    }
  }

  // Pending COD sales
  const pnd=DB.sales.filter(s=>!isRet(s)&&s.payment_type==='COD'&&!isColl(s.payment_status)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const openBatches=DB.collection_batches.filter(b=>b.status==='Open');
  const titleEl=document.getElementById('cb-pending-title');
  if(titleEl)titleEl.textContent='Pending COD Sales ('+pnd.length+')';
  const sel=document.getElementById('cb-assign-sel');
  if(sel)sel.innerHTML='<option value="">Select open batch…</option>'+openBatches.map(b=>`<option value="${b.id}">${b.batch_name}</option>`).join('');
  const sc2=document.getElementById('cb-sum-count');const st=document.getElementById('cb-sum-total');if(sc2)sc2.textContent='0';if(st)st.textContent='₪0';
  const pndEl=document.getElementById('cb-pending-tbl');
  if(!pndEl)return;
  if(!pnd.length){
    pndEl.innerHTML='<div style="padding:16px;text-align:center;color:var(--gn);font-size:12px">✅ No pending COD sales</div>';
    return;
  }
  pndEl.innerHTML=`<div style="overflow-x:auto"><table><thead><tr>
    <th><input type="checkbox" onchange="toggleAllCB(this)"></th>
    <th>Date</th><th>Customer</th><th>Product</th><th>Variant</th><th>Amount</th>
  </tr></thead><tbody>${
    pnd.map(s=>`<tr>
      <td><input type="checkbox" class="cb-check" data-sid="${s.id}" data-amt="${(+s.unit_price||0)*(+s.qty||1)}" onchange="updateCBSum()" style="width:16px;height:16px"></td>
      <td>${dF(s.date)}</td>
      <td>${s.customer_name||s.customer||'—'}</td>
      <td>${pN(s.product_id)||'—'}</td>
      <td>${s.variant_label||'—'}</td>
      <td><strong>${nisF((+s.unit_price||0)*(+s.qty||1))}</strong></td>
    </tr>`).join('')
  }</tbody></table></div>
  <div id="cb-live-sum" style="padding:12px 14px;background:var(--nv);color:#fff;border-radius:0 0 8px 8px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <div style="font-size:13px">Selected: <strong id="cb-sum-count">0</strong> invoices &nbsp;·&nbsp; Total: <strong id="cb-sum-total" style="font-size:15px;color:var(--gd)">₪0</strong></div>
    <div style="display:flex;gap:7px;align-items:center">
      <span style="font-size:11px;opacity:.7">Assign to:</span>
      ${openBatches.map(b=>`<button class="btn btn-sm" style="background:var(--gd);color:#fff;border:none;cursor:pointer;padding:6px 12px" onclick="assignToBatch('${b.id}')">✅ ${b.batch_name}</button>`).join('')}
      ${!openBatches.length?'<span style="font-size:11px;opacity:.7">Create a batch first</span>':''}
    </div>
  </div>`;
}
function toggleAllCB(master){document.querySelectorAll('.cb-check').forEach(cb=>cb.checked=master.checked);}
function assignToBatch(batchId){
  const b=DB.collection_batches.find(x=>x.id===batchId);if(!b){alert('Batch not found.');return;}
  const checked=[...document.querySelectorAll('.cb-check:checked')].map(x=>x.dataset.sid);
  if(!checked.length){alert('No sales selected.');return;}
  if(!confirm(`Assign ${checked.length} invoices to "${b.batch_name}"?

They will stay Pending until you close the batch.`))return;
  checked.forEach(sid=>{
    const s=DB.sales.find(x=>x.id===sid);if(!s)return;
    s.collection_batch_id=batchId;
    dbUpdate('sales', s.id, s);
  });
  renderColBatches();
}
function invTab(i,el){
  document.querySelectorAll('#inv-tabs .tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');
  ['inv-t0','inv-t1','inv-t2'].forEach((id,j)=>document.getElementById(id).style.display=j===i?'block':'none');
  if(i===1)renderStockCards();if(i===2)renderBatchList();
}
function renderInv(){
  const varStk=DB.variants.filter(v=>getStock(v.id)>0).length;
  const totU=DB.variants.reduce((a,v)=>a+getStock(v.id),0);
  const totC=DB.variants.reduce((a,v)=>a+getStock(v.id)*getFifoCost(v.id),0);
  const totR=DB.variants.reduce((a,v)=>a+getStock(v.id)*(+v.retail||0),0);
  document.getElementById('inv-nv').textContent=varStk;
  document.getElementById('inv-nu').textContent=totU;
  document.getElementById('inv-vc').textContent=nisF(totC);
  document.getElementById('inv-vr').textContent=nisF(totR);
  document.getElementById('inv-overview-tbl').innerHTML=tbl(DB.variants.map(v=>{
    const p=gP(v.product_id);const stk=getStock(v.id);const cost=getFifoCost(v.id);
    return{'Product':p?.name||'—','Variant':vLabel(v),
      'Stock':`<span class="b ${stk===0?'br':stk<=(+p?.alert_qty||5)?'bo':'bg'}">${stk}</span>`,
      'FIFO Cost':isAdmin()?nisF(cost):'—','Retail':nisF(+v.retail||0),'Wholesale':nisF(+v.wholesale||0),
      'Value@Cost':nisF(stk*cost),'Value@Retail':nisF(stk*(+v.retail||0)),
      'Batches':DB.batches.filter(b=>b.variant_id===v.id&&b.status==='Active').length};
  }),false);
}
function renderStockCards(){
  const fpid=document.getElementById('inv-prod-filter').value;
  const prods=fpid?DB.products.filter(p=>p.id===fpid):DB.products;
  const container=document.getElementById('stock-cards');container.innerHTML='';
  prods.forEach(prod=>{
    const variants=DB.variants.filter(v=>v.product_id===prod.id);
    const totalStk=variants.reduce((a,v)=>a+getStock(v.id),0);
    const div=document.createElement('div');div.className='prod-family-card';
    let varHTML='';
    variants.forEach(v=>{
      const stk=getStock(v.id);const cost=getFifoCost(v.id);
      const batches=DB.batches.filter(b=>b.variant_id===v.id).sort((a,b)=>String(a.shipment_date).localeCompare(String(b.shipment_date)));
      const costs=batches.flatMap(b=>DB.stock_costs.filter(c=>c.batch_id===b.id));
      varHTML+=`<div class="variant-row">
        <div style="flex:1;min-width:180px">
          <div style="font-weight:600;font-size:12px">${vLabel(v)}</div>
          <div style="font-size:11px;color:var(--mu)">Retail: ${nisF(+v.retail||0)} · Wholesale: ${nisF(+v.wholesale||0)}</div>
        </div>
        <span class="b ${stk===0?'br':stk<=3?'bo':'bg'}">${stk} units</span>
        <span style="font-size:11px;color:var(--mu)">FIFO: ${nisF(cost)}</span>
        <button class="btn btn-s btn-sm" onclick="toggleBatchDetail('bd-${v.id}')">📋 Batches (${batches.length})</button>
      </div>
      <div id="bd-${v.id}" style="display:none;margin-left:12px;margin-bottom:8px">
        ${batches.map(b=>{
          const bCosts=DB.stock_costs.filter(c=>c.batch_id===b.id);
          const totNis=bCosts.reduce((a,c)=>a+(+c.amount_nis||0),0);
          const totUsd=bCosts.reduce((a,c)=>a+(+c.amount_usd||0),0);
          const unitCost=+b.qty_received>0?totNis/+b.qty_received:0;
          const sc=b.status==='Active'?'var(--gn)':b.status==='Depleted'?'var(--rd)':'var(--or)';
          return`<div style="border:1px solid var(--bd);border-radius:8px;margin-bottom:8px;overflow:hidden">
            <div style="background:${sc};color:#fff;padding:7px 12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
              <div><div style="font-weight:700;font-size:12px">${b.shipment_code}</div>
              <div style="font-size:10px;opacity:.85">${dF(b.shipment_date)} · Rcvd: ${b.qty_received} · Rem: ${b.qty_remaining} · ${b.status}</div></div>
              ${isAdmin()&&b.status==='Pending'?`<button class="btn btn-sm" style="background:rgba(255,255,255,.25);color:#fff;border:1px solid rgba(255,255,255,.4);cursor:pointer" onclick="openReceiveBatch('${b.id}')">📦 Mark as Received</button>`:''}
              ${isAdmin()&&b.status==='Active'?`<button class="btn btn-sm" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);cursor:pointer" onclick="openSplitBatch('${b.id}')">✂️ Split</button>`:''}

              <div style="text-align:right"><div style="font-weight:700">${usdF(totUsd)} / ${nisF(totNis)}</div><div style="font-size:10px;opacity:.85">Unit: ${nisF(unitCost)}</div></div>
            </div>
            ${bCosts.length?`<table style="width:100%;border-collapse:collapse;font-size:11px">
              <tr style="background:var(--bg)"><th style="padding:4px 10px;text-align:left;color:var(--mu);font-size:9px;text-transform:uppercase">Type</th><th style="text-align:left;padding:4px 10px;font-size:9px;color:var(--mu);text-transform:uppercase">Date</th><th style="text-align:right;padding:4px 10px;font-size:9px;color:var(--mu);text-transform:uppercase">USD</th><th style="text-align:right;padding:4px 10px;font-size:9px;color:var(--mu);text-transform:uppercase">NIS</th><th style="padding:4px 10px;font-size:9px;color:var(--mu);text-transform:uppercase">Remark</th></tr>
              ${bCosts.map(c=>`<tr style="border-top:1px solid var(--bd)"><td style="padding:4px 10px"><span class="b bb" style="font-size:9px">${c.cost_type}</span></td><td style="padding:4px 10px">${dF(c.payment_date)}</td><td style="padding:4px 10px;text-align:right">${usdF(+c.amount_usd||0)}</td><td style="padding:4px 10px;text-align:right;font-weight:600">${nisF(+c.amount_nis||0)}</td><td style="padding:4px 10px;color:var(--mu)">${c.remark||'—'}</td></tr>`).join('')}
              <tr style="border-top:2px solid var(--bd);background:var(--bg);font-weight:700"><td colspan="2" style="padding:5px 10px">Total</td><td style="padding:5px 10px;text-align:right">${usdF(totUsd)}</td><td style="padding:5px 10px;text-align:right;color:var(--nv)">${nisF(totNis)}</td><td><button class="btn btn-s btn-sm" onclick="openCostForBatch('${b.id}','${prod.id}')">+Cost</button></td></tr>
            </table>`:`<div style="padding:8px 12px;font-size:11px;color:var(--mu);display:flex;justify-content:space-between;align-items:center">No cost lines yet.<button class="btn btn-s btn-sm" onclick="openCostForBatch('${b.id}','${prod.id}')">+ Add Cost</button></div>`}
          </div>`;
        }).join('')}
        <button class="btn btn-s btn-sm" onclick="openBatchForVariant('${v.id}','${prod.id}')">+ Add Batch for this variant</button>
      </div>`;
    });
    div.innerHTML=`<div class="pfc-hdr" onclick="toggleFamilyCard('fc-${prod.id}')">
      <div><h3>${prod.name}</h3><span style="font-size:11px;opacity:.7">${prod.category} · ${prod.source} · ${variants.length} variant${variants.length!==1?'s':''}</span></div>
      <div style="text-align:right"><div style="font-size:18px;font-weight:700">${totalStk} units</div>
      <div style="font-size:10px;opacity:.7">Value: ${nisF(variants.reduce((a,v)=>a+getStock(v.id)*getFifoCost(v.id),0))}</div></div>
    </div>
    <div class="pfc-body" id="fc-${prod.id}" style="display:none">
      ${varHTML}
      <button class="btn btn-s btn-sm" style="margin-top:6px" onclick="openAddVariant('${prod.id}')">+ Add Variant</button>
    </div>`;
    container.appendChild(div);
  });
}
function toggleBatchDetail(id){const e=document.getElementById(id);if(e)e.style.display=e.style.display==='none'?'block':'none';}
function toggleFamilyCard(id){const e=document.getElementById(id);if(e)e.style.display=e.style.display==='none'?'block':'none';}
function openCostForBatch(batchId,prodId){openM('m-addcost');const pe=document.getElementById('ac-prod');if(pe){pe.value=prodId;onACProdChange(batchId);}}
function openBatchForVariant(varId,prodId){openM('m-newbatch');const pe=document.getElementById('nb-prod');if(pe){pe.value=prodId;onNBProdChange();setTimeout(()=>{document.getElementById('nb-variant').value=varId;},50);}}
function renderBatchList(){
  document.getElementById('batches-tbl').innerHTML=tbl([...DB.batches].sort((a,b)=>String(b.shipment_date).localeCompare(String(a.shipment_date))).map(b=>{
    const v=gV(b.variant_id);const p=gP(b.product_id||v?.product_id);
    const costs=DB.stock_costs.filter(c=>c.batch_id===b.id);
    const totNis=costs.reduce((a,c)=>a+(+c.amount_nis||0),0);
    return{'Code':b.shipment_code,'Date':dF(b.shipment_date),'Product':p?.name||'—','Variant':v?vLabel(v):'—',
      'Rcvd':b.qty_received,'Rem':b.qty_remaining,
      'Status':`<span class="b ${b.status==='Active'?'bg':b.status==='Depleted'?'br':'bo'}">${b.status}</span>`,
      'Costs':costs.length,'Total NIS':nisF(totNis),'Unit':+b.qty_received>0?nisF(totNis/+b.qty_received):'—'};
  }),false);
}
function addBatch(){
  const pid=document.getElementById('nb-prod').value;
  const vid=document.getElementById('nb-variant').value;
  const code=document.getElementById('nb-code').value.trim();
  if(!vid||!code){alert('Select variant and enter shipment code.');return;}
  const qty=+(document.getElementById('nb-qty').value||0);
  const row={id:uid(),variant_id:vid,product_id:pid,shipment_code:code,shipment_date:document.getElementById('nb-date').value,
    qty_received:qty,qty_remaining:qty,status:document.getElementById('nb-status').value,
    total_cost_usd:0,total_cost_nis:0,unit_cost_nis:0};
  DB.batches.push(row);pushRow('batches',row);closeM('m-newbatch');renderInv();
}
function onNBProdChange(){
  const pid=document.getElementById('nb-prod').value;
  const vSel=document.getElementById('nb-variant');
  vSel.innerHTML='<option value="">— select variant —</option>'+DB.variants.filter(v=>v.product_id===pid).map(v=>`<option value="${v.id}">${vLabel(v)}</option>`).join('');
}
function onACProdChange(prefillBatch){
  const pid=document.getElementById('ac-prod').value;
  const bSel=document.getElementById('ac-batch');
  const batches=DB.batches.filter(b=>b.product_id===pid||DB.variants.find(v=>v.id===b.variant_id&&v.product_id===pid));
  bSel.innerHTML='<option value="">— select batch —</option>'+batches.map(b=>`<option value="${b.id}">${b.shipment_code} (${dF(b.shipment_date)})</option>`).join('');
  if(prefillBatch)bSel.value=prefillBatch;
}
function calcNIS(){
  const u=+(document.getElementById('ac-usd')?.value||0);
  const r=+(document.getElementById('ac-rate')?.value||3.7);
  const ne=document.getElementById('ac-nis');if(ne)ne.value=(u*r).toFixed(2);
}
function addCostLine(){
  const bid=document.getElementById('ac-batch').value;
  const pid=document.getElementById('ac-prod').value;
  if(!bid){alert('Select a batch.');return;}
  const b=DB.batches.find(x=>x.id===bid);
  const usd=+(document.getElementById('ac-usd').value||0);
  const nis=+(document.getElementById('ac-nis').value||0);
  const row={id:uid(),batch_id:bid,variant_id:b?.variant_id||'',product_id:pid,
    cost_type:document.getElementById('ac-type').value,
    payment_date:document.getElementById('ac-date').value,
    amount_usd:usd,amount_nis:nis,remark:document.getElementById('ac-rmk').value};
  DB.stock_costs.push(row);pushRow('stock_costs',row);
  recalcBatch(bid);closeM('m-addcost');renderInv();
  if(document.getElementById('inv-t1').style.display!=='none')renderStockCards();
}

// ═══ PRODUCTS & VARIANTS ═════════════════════════════════════
function addProduct(){
  const name=document.getElementById('pr-nm').value.trim();if(!name){alert('Enter name.');return;}
  const row={id:uid(),name,category:document.getElementById('pr-cat').value,source:document.getElementById('pr-src').value,
    unit:document.getElementById('pr-unit').value,alert_qty:+(document.getElementById('pr-alrt').value||5),
    min_margin_pct:+(document.getElementById('pr-margin').value||15)};
  DB.products.push(row);pushRow('products',row);closeM('m-prod');renderProds();
}
function openAddVariant(pid){
  document.getElementById('av-pid').value=pid;
  document.getElementById('addvar-title').textContent='Add Variant — '+pN(pid);
  const sel=document.getElementById('av-prod');sel.innerHTML=`<option value="${pid}">${pN(pid)}</option>`;sel.value=pid;
  // Populate from VEHICLES catalog (all defined makes)
  const avMake=document.getElementById('av-make');
  const allCatMakes=Object.keys(VEHICLES).sort();
  avMake.innerHTML='<option value="">— none (accessory) —</option>'+allCatMakes.map(m=>`<option value="${m}">${m}</option>`).join('');
  // Reset model and fields
  document.getElementById('av-model').innerHTML='<option value="">— select make first —</option>';
  ['av-yfrom','av-ret','av-whl'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('av-yto').value=2099;
  document.getElementById('av-margin').value=15;
  document.getElementById('av-set').value='';
  openM('m-addvar');
}
function onAVMakeChange(){
  const make=document.getElementById('av-make').value;
  const mSel=document.getElementById('av-model');
  mSel.innerHTML='<option value="">— select model —</option>';
  if(make){
    // Use VEHICLES catalog first, fall back to existing variants
    const catModels=VEHICLES[make]||[];
    const varModels=getModelsForMake(make);
    const allModels=[...new Set([...catModels,...varModels])].sort();
    allModels.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;mSel.appendChild(o);});
  }
}
function saveVariant(){
  const pid=document.getElementById('av-pid').value;if(!pid)return;
  const make=document.getElementById('av-make').value;
  const model=document.getElementById('av-model').value;
  const row={id:uid(),product_id:pid,car_make:make,car_model:model,
    year_from:+(document.getElementById('av-yfrom').value||0),year_to:+(document.getElementById('av-yto').value||2099),
    set_type:document.getElementById('av-set').value,
    retail:+(document.getElementById('av-ret').value||0),wholesale:+(document.getElementById('av-whl').value||0),
    min_margin_pct:+(document.getElementById('av-margin').value||15),
    stock_qty:0,avg_cost_nis:0};
  DB.variants.push(row);pushRow('variants',row);
  // Stock enters via Inventory batches or Purchases — not here
  closeM('m-addvar');populateSels();renderProds();
}
function renderProds(){
  const container=document.getElementById('prod-cards');if(!container)return;
  container.innerHTML='';
  DB.products.forEach(prod=>{
    const variants=DB.variants.filter(v=>v.product_id===prod.id);
    const div=document.createElement('div');div.className='prod-family-card';
    div.innerHTML=`<div class="pfc-hdr" onclick="toggleFamilyCard('pp-${prod.id}')">
      <div><h3>${prod.name}</h3><span style="font-size:11px;opacity:.7">${prod.category} · ${prod.source} · ${variants.length} variant${variants.length!==1?'s':''}</span></div>
      <span class="b bx">${prod.unit}</span>
    </div>
    <div class="pfc-body" id="pp-${prod.id}" style="display:none">
      ${variants.map(v=>`<div class="variant-row">
        <div style="flex:1">
          <div style="font-weight:600;font-size:12px">${vLabel(v)||'Base Variant'}</div>
          <div style="font-size:11px;color:var(--mu)">Retail: ${nisF(+v.retail||0)} · Wholesale: ${nisF(+v.wholesale||0)} · Min margin: ${v.min_margin_pct||15}%</div>
          <div style="font-size:11px;color:var(--mu)">Stock: <strong>${getStock(v.id)}</strong> · FIFO cost: ${nisF(getFifoCost(v.id))}</div>
        </div>
      </div>`).join('')}
      <button class="btn btn-s btn-sm" style="margin-top:6px" onclick="openAddVariant('${prod.id}')">+ Add Variant / Compatible Car</button>
    </div>`;
    container.appendChild(div);
  });
}

// ═══ PURCHASES ═══════════════════════════════════════════════
function addPurchase(){
  const pid=document.getElementById('pu-prod').value;
  const vid=document.getElementById('pu-variant').value;
  const qty=+(document.getElementById('pu-qty').value||1);
  const cost=+(document.getElementById('pu-cost').value||0);
  const supId=document.getElementById('pu-supplier-id').value;
  if(!pid||!cost){alert('Select product and enter cost.');return;}
  if(!supId){alert('Select a supplier.');return;}
  const sup=gSup(supId);
  const bCode='LOCAL-'+Date.now();
  // Create inventory batch
  const b={id:uid(),variant_id:vid||'',product_id:pid,supplier_id:supId,
    shipment_code:bCode,shipment_date:document.getElementById('pu-date').value,
    qty_received:qty,qty_remaining:qty,status:'Active',
    total_cost_usd:0,total_cost_nis:cost*qty,unit_cost_nis:cost};
  DB.batches.push(b);pushRow('batches',b);
  // Create stock cost line linked to supplier
  const cl={id:uid(),batch_id:b.id,variant_id:vid||'',product_id:pid,supplier_id:supId,
    cost_type:'Purchase',payment_date:document.getElementById('pu-date').value,
    amount_usd:0,amount_nis:cost*qty,remark:'Local purchase — '+(sup?sup.name:'')};
  DB.stock_costs.push(cl);pushRow('stock_costs',cl);
  // Create purchase record
  const row={id:uid(),date:document.getElementById('pu-date').value,
    product_id:pid,variant_id:vid||'',batch_id:b.id,supplier_id:supId,
    qty,unit_cost:cost,total_cost:cost*qty,
    status:document.getElementById('pu-stat').value,
    remark:document.getElementById('pu-rmk').value};
  if(!DB.purchases)DB.purchases=[];
  DB.purchases.push(row);pushRow('purchases',row);
  closeM('m-pur');renderPur();renderSuppliers();renderDash();
}
function onPurSupChange(){
  const id=document.getElementById('pu-supplier-id').value;
  const el=document.getElementById('pu-sup-bal');if(!el)return;
  if(!id){el.textContent='';return;}
  const s=gSup(id);if(!s)return;
  const bal=getSupBal(id);
  el.innerHTML=`Current balance owed: <strong style="color:${bal>0?'var(--rd)':'var(--gn)'}">${nisF(bal)}</strong>`;
}
function onPurProdChange(){
  const pid=document.getElementById('pu-prod').value;
  const vSel=document.getElementById('pu-variant');
  vSel.innerHTML='<option value="">— select variant (optional) —</option>'+DB.variants.filter(v=>v.product_id===pid).map(v=>`<option value="${v.id}">${vLabel(v)}</option>`).join('');
}
function renderPur(){
  if(!DB.purchases)DB.purchases=[];
  const list=[...DB.purchases].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const total=list.reduce((a,p)=>a+(+p.total_cost||0)||(+p.unit_cost||0)*(+p.qty||0),0);
  const paid=list.filter(p=>p.status==='Paid').reduce((a,p)=>a+(+p.total_cost||0)||(+p.unit_cost||0)*(+p.qty||0),0);
  document.getElementById('pur-summary').innerHTML=
    `Total: <strong>${nisF(total)}</strong> &nbsp;·&nbsp; <span class="apos">Paid: ${nisF(paid)}</span> &nbsp;·&nbsp; <span class="aneg">Pending: ${nisF(total-paid)}</span>`;
  document.getElementById('pur-tbl').innerHTML=tbl(list.map(p=>{
    const sup=gSup(p.supplier_id);
    const tot=(+p.total_cost||0)||((+p.unit_cost||0)*(+p.qty||0));
    return{
      'Date':dF(p.date),
      'Supplier':sup?`<span class="b ${sup.type==='Overseas'?'bb':'bgd'}">${sup.name}</span>`:'—',
      'Product':pN(p.product_id)||'—',
      'Qty':p.qty||0,
      'Unit Cost':nisF(+p.unit_cost||0),
      'Total':nisF(tot),
      'Status':`<span class="b ${p.status==='Paid'?'bg':'bo'}">${p.status||'Pending'}</span>`,
      'Remark':p.remark||''
    };
  }),false);
}
function openAddWC(){
  document.getElementById('wc-modal-title').textContent='Add Wholesale Customer';
  document.getElementById('wc-edit-id').value='';
  ['wc-nm','wc-ph','wc-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('wc-limit').value=0;
  document.getElementById('wc-days').value=30;
  const d=document.getElementById('wc-disc');if(d)d.value=0;
  const pu=document.getElementById('wc-portal-user');if(pu)pu.value='';
  const pp=document.getElementById('wc-portal-pin');if(pp)pp.value='';
  const pa=document.getElementById('wc-portal-active');if(pa)pa.value='true';
  openM('m-wc');
}
function openEditWC(id){
  const c=DB.wholesale_customers.find(x=>x.id===id);if(!c)return;
  document.getElementById('wc-modal-title').textContent='Edit: '+c.name;
  document.getElementById('wc-edit-id').value=id;
  document.getElementById('wc-nm').value=c.name||'';
  document.getElementById('wc-ph').value=c.phone||'';
  document.getElementById('wc-limit').value=+c.credit_limit_nis||0;
  document.getElementById('wc-days').value=+c.credit_days||30;
  const d=document.getElementById('wc-disc');if(d)d.value=+c.discount_pct||0;
  document.getElementById('wc-notes').value=c.notes||'';
  const pu=document.getElementById('wc-portal-user');if(pu)pu.value=c.portal_username||c.name.toLowerCase().replace(/\s+/g,'');
  const pp=document.getElementById('wc-portal-pin');if(pp)pp.value='';
  const pa=document.getElementById('wc-portal-active');if(pa)pa.value=c.portal_active===false?'false':'true';
  openM('m-wc');
}
async function saveWC(){
  const name=document.getElementById('wc-nm').value.trim();if(!name){alert('Enter name.');return;}
  const editId=document.getElementById('wc-edit-id').value;
  const portalUser=(document.getElementById('wc-portal-user')?.value||'').trim().toLowerCase();
  const portalPin=document.getElementById('wc-portal-pin')?.value||'';
  const portalActive=document.getElementById('wc-portal-active')?.value!=='false';
  if(portalPin&&portalPin.length<4){alert('Portal password must be at least 4 characters.');return;}
  const row={id:editId||uid(),name,
    phone:document.getElementById('wc-ph').value,
    credit_limit_nis:parseFloat(document.getElementById('wc-limit').value)||0,
    credit_days:parseInt(document.getElementById('wc-days').value)||30,
    discount_pct:parseFloat(document.getElementById('wc-disc')?.value)||0,
    notes:document.getElementById('wc-notes').value,
    portal_username:portalUser||name.toLowerCase().replace(/\s+/g,''),
    portal_active:portalActive};
  showLoader('Saving…');
  try{
    if(editId){
      const idx=DB.wholesale_customers.findIndex(x=>x.id===editId);
      if(idx>=0)DB.wholesale_customers[idx]={...DB.wholesale_customers[idx],...row};
      await sbFetch('/rest/v1/wholesale_customers?id=eq.'+editId,{method:'PATCH',body:JSON.stringify(row)},true);
    }else{
      DB.wholesale_customers.push(row);
      await sbInsert('wholesale_customers',row);
    }
    // Hash and save password via RPC if provided
    if(portalPin){
      await sbFetch('/rest/v1/rpc/update_portal_password',{
        method:'POST',body:JSON.stringify({p_customer_id:row.id,p_password:portalPin})
      },true);
    }
    hideLoader();
    closeM('m-wc');populateSels();renderWholesale();
  }catch(e){hideLoader();alert('❌ Error: '+e.message);}
}
function renderWholesale(){
  const cards=document.getElementById('wc-cards');
  if(!DB.wholesale_customers.length){cards.innerHTML='<div class="al al-i" style="grid-column:1/-1">No wholesale customers yet.</div>';document.getElementById('wc-stmt').innerHTML='';return;}
  cards.innerHTML=DB.wholesale_customers.map(c=>{
    const bal=getWCBal(c.id),lim=+c.credit_limit_nis||0,avail=lim-bal,od=getWCOverdue(c.id);
    const pct=lim?Math.min(bal/lim*100,100):0;
    return`<div class="kc" style="border-top:3px solid var(--nv)">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:9px">
        <div><div style="font-weight:700;font-size:14px">${c.name}</div>
        <div style="font-size:11px;color:var(--mu)">${c.phone||'—'} · ${c.credit_days||30} day terms</div></div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-s btn-sm" onclick="document.getElementById('wc-stmt-sel').value='${c.id}';renderWCStmt()">Statement</button>
          ${isAdmin()?`<button class="btn btn-s btn-sm" onclick="openEditWC('${c.id}')">✏️ Edit</button>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:9px;font-size:12px">
        <div><div style="font-size:10px;color:var(--mu);text-transform:uppercase">Outstanding</div><div style="font-weight:700;color:${bal>0?'var(--rd)':'var(--gn)'};">${nisF(bal)}</div></div>
        <div><div style="font-size:10px;color:var(--mu);text-transform:uppercase">Credit Limit</div><div style="font-weight:700">${nisF(lim)}</div></div>
        <div><div style="font-size:10px;color:var(--mu);text-transform:uppercase">Available</div><div style="font-weight:700;color:${avail>0?'var(--gn)':'var(--rd)'};">${nisF(avail)}</div></div>
        <div><div style="font-size:10px;color:var(--mu);text-transform:uppercase">Overdue</div><div style="font-weight:700;color:${od>0?'var(--rd)':'var(--gn)'};">${od>0?nisF(od):'None'}</div></div>
      </div>
      <div class="credit-bar"><div class="credit-fill" style="width:${pct.toFixed(1)}%;background:${pct>90?'var(--rd)':pct>70?'var(--or)':'var(--gn)'}"></div></div>
      <div style="font-size:10px;color:var(--mu);margin-top:2px">${pct.toFixed(0)}% of limit used</div>
      ${od>0?`<div class="al al-r" style="margin-top:7px;padding:6px 10px;font-size:11px">⚠️ Overdue: ${nisF(od)}</div>`:''}
    </div>`;
  }).join('');
  renderWCStmt();
  renderReservations();
}
function renderWCStmt(){
  const id=document.getElementById('wc-stmt-sel').value;
  const el=document.getElementById('wc-stmt');
  if(!id||!el){if(el)el.innerHTML='<div style="padding:14px;text-align:center;color:var(--mu);font-size:12px">Select a customer above.</div>';return;}
  const wc=gWC(id);if(!wc){el.innerHTML='';return;}
  const sales=DB.sales.filter(s=>s.customer_id===id&&!isRet(s)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  let running=0;
  const rows=sales.map(s=>{
    const amt=(+s.unit_price||0)*(+s.qty||1);
    const paid=isColl(s.payment_status)?amt:0;
    running+=amt-paid;
    return{'Date':dF(s.date),'Product':pN(s.product_id),'Variant':s.variant_label||'—',
      'Invoice':nisF(amt),'Collected':paid>0?`<span class="apos">${nisF(paid)}</span>`:'—',
      'Balance':`<span class="${running>0?'aneg':'apos'}">${nisF(running)}</span>`,
      'Status':pBadge(s.payment_status),'Coll.Date':s.collection_date?dF(s.collection_date):'—'};
  });
  const bal=getWCBal(id),lim=+wc.credit_limit_nis||0,od=getWCOverdue(id);
  el.innerHTML=`<div id="stmt-print-area">
    <div style="padding:10px 14px;background:var(--bg);border-bottom:1px solid var(--bd);display:flex;gap:18px;flex-wrap:wrap;font-size:12px">
      <span>Customer: <strong>${wc.name}</strong></span><span>Limit: <strong>${nisF(lim)}</strong></span>
      <span>Balance: <strong class="${bal>0?'aneg':'apos'}">${nisF(bal)}</strong></span>
      <span>Overdue: <strong class="${od>0?'aneg':'apos'}">${od>0?nisF(od):'None'}</strong></span>
      <span>Terms: <strong>${wc.credit_days||30} days</strong></span>
    </div>
    ${tbl(rows,false)}
  </div>`;
}
function printStatement(){
  const area=document.getElementById('stmt-print-area');if(!area){alert('Select a customer first.');return;}
  const w=window.open('','_blank','width=800,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>Statement</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse}
    th,td{padding:6px 10px;border:1px solid #ddd;text-align:left}th{background:#1B2A4A;color:#fff}
    .aneg{color:#C0392B;font-weight:600}.apos{color:#1A8C5B;font-weight:600}</style></head><body>
    <h2 style="color:#1B2A4A">Copra — Statement of Account</h2>${area.innerHTML}</body></html>`);
  w.document.close();w.print();
}

// ═══ EXPENSES ═══════════════════════════════════════════════
function expTab(i,el){document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');document.getElementById('exp-t0').style.display=i===0?'block':'none';document.getElementById('exp-t1').style.display=i===1?'block':'none';}
function addExpense(){
  const amt=+(document.getElementById('ex-amt').value||0);const desc=document.getElementById('ex-desc').value.trim();
  if(!desc||!amt){alert('Enter description and amount.');return;}
  const row={id:uid(),date:document.getElementById('ex-date').value,desc,category:document.getElementById('ex-cat').value,amount:amt,project:document.getElementById('ex-proj').value};
  DB.expenses.push(row);pushRow('expenses',row);closeM('m-exp');renderExp();
}
function renderExp(){
  const ops=DB.expenses.filter(e=>e.category!=='Stock Purchase');
  const sp=DB.expenses.filter(e=>e.category==='Stock Purchase');
  const tot=ops.reduce((a,e)=>a+(+e.amount||0),0);
  const mkt=ops.filter(e=>e.category==='Marketing').reduce((a,e)=>a+(+e.amount||0),0);
  const ov=ops.filter(e=>e.category==='Operations').reduce((a,e)=>a+(+e.amount||0),0);
  document.getElementById('exp-tot').textContent=nisF(tot);
  document.getElementById('exp-mkt').textContent=nisF(mkt);
  document.getElementById('exp-ops').textContent=nisF(ov);
  document.getElementById('exp-oth').textContent=nisF(tot-mkt-ov);
  document.getElementById('exp-tbl').innerHTML=tbl(ops.sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(e=>({'Date':dF(e.date),'Description':e.desc,'Category':`<span class="b ${e.category==='Marketing'?'bgd':e.category==='Operations'?'bb':'bx'}">${e.category}</span>`,'Amount':`<span class="aneg">${nisF(+e.amount||0)}</span>`,'Project':e.project||'—'})),false);
  document.getElementById('sp-tot').textContent=nisF(sp.reduce((a,e)=>a+(+e.amount||0),0));
  document.getElementById('sp-tbl').innerHTML=tbl(sp.sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(e=>({'Date':dF(e.date),'Description':e.desc,'Amount':`<span class="aneg">${nisF(+e.amount||0)}</span>`,'Project':e.project||'—'})),false);
}

// ═══ PARTNER PAYMENTS ════════════════════════════════════════
function addPayment(){
  const amt=+(document.getElementById('pay-amt').value||0);if(!amt){alert('Enter amount.');return;}
  const row={id:uid(),date:document.getElementById('pay-date').value,partner:document.getElementById('pay-par').value,amount:amt,remark:document.getElementById('pay-rmk').value};
  DB.payments.push(row);pushRow('payments',row);closeM('m-pay');renderPay();renderDash();
}
function renderPay(){
  const cP=name=>{
    const o=DB.purchases.filter(p=>p.payment===`Credit/${name}`).reduce((a,p)=>a+(+p.unit_cost||0)*(+p.qty||0),0);
    const pd=DB.payments.filter(p=>p.partner===name).reduce((a,p)=>a+(+p.amount||0),0);
    return{o,pd,b:o-pd};
  };
  document.getElementById('partner-cards').innerHTML=['Saleem','Saed'].map(name=>{
    const{o,pd,b}=cP(name);const pct=o?Math.min(pd/o*100,100):0;
    return`<div class="kc" style="border-top:3px solid var(--nv)"><div style="display:flex;justify-content:space-between">
      <div><div class="kl">${name}</div><div class="kv">${nisF(o)}</div><div class="ks">Credit used</div></div>
      <div style="text-align:right"><div class="kl">Paid</div><div style="font-size:18px;font-weight:700;color:var(--gn)">${nisF(pd)}</div></div></div>
      <div style="margin-top:9px"><div class="br-trk" style="height:6px;border-radius:3px"><div class="br-fil" style="width:${pct.toFixed(1)}%;background:${b>0?'var(--gd)':'var(--gn)'};height:100%;border-radius:3px"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:3px;font-size:11px"><span style="color:var(--mu)">${pct.toFixed(0)}% paid</span><span style="font-weight:600;color:${b>0?'var(--rd)':'var(--gn)'}">${b>0?'Owe '+nisF(b):'Settled ✓'}</span></div></div></div>`;
  }).join('');
  document.getElementById('pay-tbl').innerHTML=tbl([...DB.payments].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(p=>({'Date':dF(p.date),'Partner':`<span class="b bx">${p.partner}</span>`,'Amount':nisF(+p.amount||0),'Remark':p.remark||'—'})),false);
}

// ═══ CUSTOMERS ═══════════════════════════════════════════════
function renderCusts(){
  const q=(document.getElementById('cq')?.value||'').toLowerCase();
  const ft=document.getElementById('ct')?.value||'';
  const map={};
  DB.sales.filter(s=>!isRet(s)&&(s.customer_name||s.customer)).forEach(s=>{
    const k=s.customer_name||s.customer;
    if(!map[k])map[k]={name:k,orders:0,total:0,type:s.sale_type||'Retail',last:''};
    map[k].orders++;map[k].total+=(+s.unit_price||0)*(+s.qty||1);
    if(s.sale_type==='Wholesale')map[k].type='Wholesale';
    if(!map[k].last||String(s.date)>map[k].last)map[k].last=s.date;
  });
  let list=Object.values(map).sort((a,b)=>b.total-a.total);
  if(q)list=list.filter(c=>c.name.toLowerCase().includes(q));
  if(ft)list=list.filter(c=>c.type===ft);
  document.getElementById('cust-cnt').textContent=list.length+' customers';
  document.getElementById('cust-tbl').innerHTML=tbl(list.map(c=>({'Name':c.name,'Orders':c.orders,'Revenue':nisF(c.total),'Avg':nisF(c.total/c.orders),'Type':`<span class="b ${c.type==='Wholesale'?'bb':'bg'}">${c.type}</span>`,'Last Sale':dF(c.last)})),false);
}

// ═══ EXCEL EXPORT ════════════════════════════════════════════
function exportExcel(type){
  let data=[],name='export';
  if(type==='sales'){
    data=DB.sales.map(s=>({Date:dF(s.date),Customer:s.customer_name||s.customer||'',Product:pN(s.product_id),Variant:s.variant_label||'',Qty:s.qty,Price:+s.unit_price||0,Cost:+s.unit_cost_nis||0,GP:+s.gp_nis||0,'Pay Type':s.payment_type||'','Pay Status':s.payment_status||'','Coll.Date':s.collection_date?dF(s.collection_date):'','Sale Type':s.sale_type||'','Car Make':s.car_make||'','Car Model':s.car_model||'','Set Type':s.set_type||'',Remark:s.remark||''}));
    name='Sales';
  } else if(type==='inventory'){
    data=DB.variants.map(v=>{const p=gP(v.product_id);return{Product:p?.name||'',Variant:vLabel(v),'Car Make':v.car_make||'','Car Model':v.car_model||'','Year From':v.year_from||'','Year To':v.year_to||'','Set Type':v.set_type||'',Stock:getStock(v.id),'FIFO Cost':getFifoCost(v.id),Retail:+v.retail||0,Wholesale:+v.wholesale||0,'Min Margin%':v.min_margin_pct||15};});
    name='Inventory';
  } else if(type==='expenses'){
    data=DB.expenses.map(e=>({Date:dF(e.date),Description:e.desc,Category:e.category,Amount:+e.amount||0,Project:e.project||''}));
    name='Expenses';
  } else if(type==='payments'){
    data=DB.payments.map(p=>({Date:dF(p.date),Partner:p.partner,Amount:+p.amount||0,Remark:p.remark||''}));
    name='Payments';
  } else if(type==='purchases'){
    data=DB.purchases.map(p=>({Date:dF(p.date),Product:pN(p.product_id),Qty:p.qty,'Unit Cost':+p.unit_cost||0,Total:(+p.unit_cost||0)*(+p.qty||0),Payment:p.payment,Status:p.status||'',Remark:p.remark||''}));
    name='Purchases';
  } else if(type==='wholesale_customers'){
    data=DB.wholesale_customers.map(c=>({Name:c.name,Phone:c.phone||'','Credit Limit (NIS)':+c.credit_limit_nis||0,'Credit Days':+c.credit_days||30,Balance:getWCBal(c.id),Overdue:getWCOverdue(c.id),Notes:c.notes||''}));
    name='WholesaleCustomers';
  } else if(type==='variants'){
    data=DB.variants.map(v=>{const p=gP(v.product_id);return{Product:p?.name||'',Variant:vLabel(v),'Car Make':v.car_make||'','Car Model':v.car_model||'','Year From':v.year_from||'','Year To':v.year_to||'','Set Type':v.set_type||'',Retail:+v.retail||0,Wholesale:+v.wholesale||0,'Min Margin%':v.min_margin_pct||15,Stock:getStock(v.id)};});
    name='Variants';
  } else if(type==='collection_batches'){
    data=DB.collection_batches.map(b=>({'Batch Name':b.batch_name,'Collection Date':b.collection_date?dF(b.collection_date):'',Barcode:b.barcode||'',Status:b.status,Invoices:b.invoice_count||0,Amount:+b.total_amount||0,Notes:b.notes||''}));
    name='CollectionBatches';
  } else if(type==='customers'){
    const map={};DB.sales.filter(s=>!isRet(s)&&(s.customer_name||s.customer)).forEach(s=>{const k=s.customer_name||s.customer;if(!map[k])map[k]={name:k,orders:0,total:0,type:s.sale_type||'Retail',last:''};map[k].orders++;map[k].total+=(+s.unit_price||0)*(+s.qty||1);if(s.sale_type==='Wholesale')map[k].type='Wholesale';if(!map[k].last||String(s.date)>map[k].last)map[k].last=s.date;});
    data=Object.values(map).sort((a,b)=>b.total-a.total).map(c=>({Name:c.name,Orders:c.orders,Revenue:c.total,Avg:+(c.total/c.orders).toFixed(2),Type:c.type,'Last Sale':dF(c.last)}));
    name='Customers';
  }
  if(type==='suppliers'){
    const d=(DB.suppliers||[]).map(s=>({Name:s.name,Type:s.type,Phone:s.phone||'','Credit Limit':+s.credit_limit_nis||0,Balance:getSupBal(s.id),Notes:s.notes||''}));
    if(!d.length){alert('No suppliers.');return;}
    const ws=XLSX.utils.json_to_sheet(d);const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Suppliers');
    XLSX.writeFile(wb,'ZAuto_Suppliers.xlsx');return;
  }
  if(!data.length){alert('No data to export.');return;}
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,name);
  XLSX.writeFile(wb,`ZAuto_${name}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ═══ MODALS ══════════════════════════════════════════════════
function openM(id){
  if(id==='m-handover'){openHandoverModal&&openHandoverModal();document.getElementById('m-handover')?.classList.add('open');return;}
  populateSels();
  const d=tod();
  ['s-date','r-date','cb-date','nb-date','ac-date','pu-date','ex-date','pay-date'].forEach(f=>{const e=document.getElementById(f);if(e&&!e.value)e.value=d;});
  document.getElementById(id)?.classList.add('open');
}
function closeM(id){document.getElementById(id)?.classList.remove('open');}
document.querySelectorAll('.mo').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));

// ═══ GAS DOWNLOAD ════════════════════════════════════════════


// ═══ AUTH ════════════════════════════════════════════════════
// ═══ INIT ════════════════════════════════════════════════════
// session init handled by secure config above



function gSup(id){return(DB.suppliers||[]).find(x=>x.id===id)||null;}
function getSupBal(sid){return(DB.purchases||[]).filter(p=>p.supplier_id===sid).reduce((a,p)=>a+(+p.unit_cost||0)*(+p.qty||0),0)+(DB.stock_costs||[]).filter(c=>c.supplier_id===sid).reduce((a,c)=>a+(+c.amount_nis||0),0)-(DB.supplier_payments||[]).filter(p=>p.supplier_id===sid).reduce((a,p)=>a+(+p.amount_nis||0),0);}
function openAddSupplier(){
  document.getElementById('sup-modal-title').textContent='Add Supplier';
  document.getElementById('sup-edit-id').value='';
  ['sup-nm','sup-ph','sup-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('sup-limit').value=0;
  document.getElementById('sup-days').value=30;
  const st=document.getElementById('sup-type');if(st)st.value='Overseas';
  openM('m-sup');
}
function openEditSupplier(id){
  const s=(DB.suppliers||[]).find(x=>x.id===id);if(!s)return;
  document.getElementById('sup-modal-title').textContent='Edit: '+s.name;
  document.getElementById('sup-edit-id').value=id;
  document.getElementById('sup-nm').value=s.name||'';
  document.getElementById('sup-ph').value=s.phone||'';
  document.getElementById('sup-limit').value=+s.credit_limit_nis||0;
  document.getElementById('sup-days').value=+s.credit_days||30;
  document.getElementById('sup-notes').value=s.notes||'';
  const st=document.getElementById('sup-type');if(st)st.value=s.type||'Overseas';
  openM('m-sup');
}
function saveSupplier(){
  const name=document.getElementById('sup-nm').value.trim();if(!name){alert('Enter name.');return;}
  const editId=document.getElementById('sup-edit-id').value;
  const row={id:editId||uid(),name,
    type:document.getElementById('sup-type').value,
    phone:document.getElementById('sup-ph').value,
    credit_limit_nis:parseFloat(document.getElementById('sup-limit').value)||0,
    credit_days:parseInt(document.getElementById('sup-days').value)||30,
    notes:document.getElementById('sup-notes').value};
  if(!DB.suppliers)DB.suppliers=[];
  if(editId){
    const idx=DB.suppliers.findIndex(x=>x.id===editId);
    if(idx>=0)DB.suppliers[idx]={...DB.suppliers[idx],...row};
    dbUpdate('suppliers', row.id, row);
  }else{
    DB.suppliers.push(row);
    dbInsert('suppliers', row);
  }
  closeM('m-sup');renderSuppliers();
}
function openSupPayModal(sid){if(!(DB.suppliers||[]).length){alert('No suppliers yet.');return;}const sel=document.getElementById('sp2-sup');if(sel){sel.innerHTML='<option value="">— select —</option>'+(DB.suppliers||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');if(sid)sel.value=sid;}document.getElementById('sp2-date').value=tod();document.getElementById('sp2-nis').value='';document.getElementById('sp2-rmk').value='';if(sid)onSupPaySelChange();openM('m-suppay');}
function onSupPaySelChange(){const id=document.getElementById('sp2-sup').value;const el=document.getElementById('sp2-info');if(!el)return;if(!id){el.textContent='';return;}const s=gSup(id);if(!s)return;const bal=getSupBal(id);el.innerHTML=`Outstanding: <strong style="color:${bal>0?'var(--rd)':'var(--gn)'}">${nisF(bal)}</strong>`;}
function addSupPay(){const sid=document.getElementById('sp2-sup').value;if(!sid){alert('Select supplier.');return;}const nis=parseFloat(document.getElementById('sp2-nis').value)||0;if(!nis){alert('Enter amount.');return;}const row={id:uid(),supplier_id:sid,date:document.getElementById('sp2-date').value,amount_nis:nis,amount_usd:0,remark:document.getElementById('sp2-rmk').value};if(!DB.supplier_payments)DB.supplier_payments=[];DB.supplier_payments.push(row);dbInsert('supplier_payments', row);closeM('m-suppay');renderSuppliers();renderDash();}
function renderSuppliers(){const el=document.getElementById('sup-cards');if(!el)return;if(!(DB.suppliers||[]).length){el.innerHTML='<div style="padding:14px;background:var(--bbg);border-radius:8px;color:var(--bl);font-size:12px">No suppliers yet.</div>';return;}el.innerHTML=(DB.suppliers||[]).map(s=>{const bal=getSupBal(s.id);const paid=(DB.supplier_payments||[]).filter(p=>p.supplier_id===s.id).reduce((a,p)=>a+(+p.amount_nis||0),0);return`<div class="kc" style="border-top:3px solid ${s.type==='Overseas'?'var(--bl)':'var(--gd)'}"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px"><div><div style="font-weight:700;font-size:14px">${s.name}</div><div style="font-size:11px;color:var(--mu)">${s.type}</div></div><span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:${s.type==='Overseas'?'var(--bbg)':'rgba(201,153,58,.12)'};color:${s.type==='Overseas'?'var(--bl)':'var(--gd)'}">${s.type}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:10px"><div><div style="font-size:10px;color:var(--mu)">Outstanding</div><div style="font-weight:700;color:${bal>0?'var(--rd)':'var(--gn)'}">${nisF(bal)}</div></div><div><div style="font-size:10px;color:var(--mu)">Paid</div><div style="font-weight:700;color:var(--gn)">${nisF(paid)}</div></div></div><div style="display:flex;gap:6px"><button class="btn btn-s btn-sm" onclick="document.getElementById('sup-stmt-sel').value='${s.id}';renderSupStmt()">Statement</button><button class="btn btn-p btn-sm" onclick="openSupPayModal('${s.id}')">+ Payment</button>
        <button class="btn btn-s btn-sm" onclick="openEditSupplier('${s.id}')">✏️ Edit</button></div></div>`;}).join('');const sel=document.getElementById('sup-stmt-sel');if(sel)sel.innerHTML='<option value="">Select supplier…</option>'+(DB.suppliers||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');renderSupStmt();}
function renderSupStmt(){const id=document.getElementById('sup-stmt-sel').value;const el=document.getElementById('sup-stmt');if(!el)return;if(!id){el.innerHTML='<div style="padding:14px;text-align:center;color:var(--mu);font-size:12px">Select a supplier above.</div>';return;}const sup=gSup(id);if(!sup){el.innerHTML='';return;}const rows=[...(DB.purchases||[]).filter(p=>p.supplier_id===id).map(p=>({d:p.date,t:'Purchase',desc:(gP(p.product_id)?.name||'—')+' × '+p.qty,db:(+p.unit_cost||0)*(+p.qty||0),cr:0})),...(DB.stock_costs||[]).filter(c=>c.supplier_id===id).map(c=>({d:c.payment_date,t:c.cost_type,desc:c.remark||'',db:+c.amount_nis||0,cr:0})),...(DB.supplier_payments||[]).filter(p=>p.supplier_id===id).map(p=>({d:p.date,t:'Payment',desc:p.remark||'Payment',db:0,cr:+p.amount_nis||0}))].sort((a,b)=>String(a.d||'').localeCompare(String(b.d||'')));let run=0;const td=rows.map(r=>{run+=r.db-r.cr;return{'Date':dF(r.d),'Type':`<span class="b ${r.t==='Payment'?'bg':'br'}">${r.t}</span>`,'Desc':r.desc,'Debit':r.db>0?`<span style="color:var(--rd);font-weight:600">${nisF(r.db)}</span>`:'—','Credit':r.cr>0?`<span style="color:var(--gn);font-weight:600">${nisF(r.cr)}</span>`:'—','Balance':`<span style="color:${run>0?'var(--rd)':'var(--gn)'};font-weight:600">${nisF(run)}</span>`};});el.innerHTML=`<div style="padding:9px 14px;background:var(--bg);border-bottom:1px solid var(--bd);font-size:12px">Supplier: <strong>${sup.name}</strong> · Balance owed: <strong style="color:${getSupBal(id)>0?'var(--rd)':'var(--gn)'}">${nisF(getSupBal(id))}</strong></div>${tbl(td,false)}`;}



function renderVehicles(){
  // Vehicle catalog - shows all makes/models from VEHICLES object
  const VEHICLES = DB.vehicle_catalog||{};
  const makes = Object.keys(VEHICLES).sort();
  let rows = [];
  makes.forEach(make => {
    (VEHICLES[make]||[]).sort().forEach(model => {
      rows.push({'Make':make,'Model':model});
    });
  });
  const el = document.getElementById('vehicles-tbl');
  if(el) el.innerHTML = tbl(rows, false);
  const cnt = document.getElementById('vehicles-count');
  if(cnt) cnt.textContent = rows.length + ' models across ' + makes.length + ' makes';
}

function setSalePayType(type){
  document.getElementById('s-paytype').value=type;
  const cashBtn=document.getElementById('s-pay-btn-cash');
  const codBtn=document.getElementById('s-pay-btn-cod');
  if(type==='Cash'){
    cashBtn.style.borderColor='var(--gd)';cashBtn.style.background='var(--gd)';cashBtn.style.color='#fff';
    codBtn.style.borderColor='var(--bd)';codBtn.style.background='var(--bg)';codBtn.style.color='var(--mu)';
  } else {
    codBtn.style.borderColor='var(--or)';codBtn.style.background='var(--or)';codBtn.style.color='#fff';
    cashBtn.style.borderColor='var(--bd)';cashBtn.style.background='var(--bg)';cashBtn.style.color='var(--mu)';
  }
  onPayTypeChange();
}
// ════ WHOLESALE COLLECTION BATCHES ════════════════════════════════════

// Tab switch
function cbTab(i, el){
  document.querySelectorAll('#cb-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('cb-t-cod').style.display  = i===0?'block':'none';
  document.getElementById('cb-t-whl').style.display  = i===1?'block':'none';
  if(i===1) renderWhlColBatches();
}

// ── Wholesale batch CRUD ──────────────────────────────────────────────
function openNewWhlBatch(){
  document.getElementById('whl-batch-modal-title').textContent='New Wholesale Collection Batch';
  document.getElementById('whl-batch-edit-id').value='';
  ['whl-batch-name','whl-batch-ref','whl-batch-notes'].forEach(id=>{
    const e=document.getElementById(id);if(e)e.value='';
  });
  document.getElementById('whl-batch-date').value=tod();
  // Populate customer select
  const sel=document.getElementById('whl-batch-cust');
  sel.innerHTML='<option value="">— select —</option>'+
    DB.wholesale_customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  openM('m-whl-batch');
}
function openEditWhlBatch(id){
  const b=DB.wholesale_batches.find(x=>x.id===id);if(!b)return;
  document.getElementById('whl-batch-modal-title').textContent='Edit Wholesale Batch';
  document.getElementById('whl-batch-edit-id').value=id;
  document.getElementById('whl-batch-name').value=b.batch_name||'';
  document.getElementById('whl-batch-date').value=b.collection_date||'';
  document.getElementById('whl-batch-ref').value=b.reference||'';
  document.getElementById('whl-batch-notes').value=b.notes||'';
  const sel=document.getElementById('whl-batch-cust');
  sel.innerHTML='<option value="">— select —</option>'+
    DB.wholesale_customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  sel.value=b.customer_id||'';
  openM('m-whl-batch');
}
function saveWhlBatch(){
  const name=document.getElementById('whl-batch-name').value.trim();
  const custId=document.getElementById('whl-batch-cust').value;
  if(!name){alert('Enter batch name.');return;}
  if(!custId){alert('Select a wholesale customer.');return;}
  if(!DB.wholesale_batches)DB.wholesale_batches=[];
  const editId=document.getElementById('whl-batch-edit-id').value;
  const row={id:editId||uid(),batch_name:name,customer_id:custId,
    collection_date:document.getElementById('whl-batch-date').value,
    reference:document.getElementById('whl-batch-ref').value,
    notes:document.getElementById('whl-batch-notes').value,
    total_amount:0,invoice_count:0,status:'Open'};
  if(editId){
    const idx=DB.wholesale_batches.findIndex(x=>x.id===editId);
    if(idx>=0)DB.wholesale_batches[idx]={...DB.wholesale_batches[idx],...row};
    dbUpdate('wholesale_batches', row.id, row);
  } else {
    DB.wholesale_batches.push(row);
    dbInsert('wholesale_batches', row);
  }
  closeM('m-whl-batch');renderWhlColBatches();
}

// ── Render wholesale batches tab ──────────────────────────────────────
function renderWhlColBatches(){
  if(!DB.wholesale_batches)DB.wholesale_batches=[];
  // Customer filter
  const fSel=document.getElementById('whl-cust-filter');
  if(fSel){
    const cur=fSel.value;
    fSel.innerHTML='<option value="">All Customers</option>'+
      DB.wholesale_customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    fSel.value=cur;
  }
  const allWhl=[...DB.wholesale_batches].sort((a,b)=>String(b.collection_date||'').localeCompare(String(a.collection_date||'')));
  const openWhl=allWhl.filter(b=>b.status==='Open');
  const closedWhl=allWhl.filter(b=>b.status!=='Open');

  // Active cards
  const cards=document.getElementById('whl-cb-cards');
  if(cards){
    if(!openWhl.length){
      cards.innerHTML='<div style="font-size:12px;color:var(--mu);padding:8px 0">No open wholesale batches.</div>';
    } else {
      cards.innerHTML=openWhl.map(b=>{
        const wc=gWC(b.customer_id);
        const bSales=DB.sales.filter(s=>s.collection_batch_id===b.id&&!isRet(s));
        const bTotal=bSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
        return`<div class="kc" style="border-top:3px solid var(--nv)">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:7px">
            <div>
              <div style="font-weight:700;font-size:14px">${b.batch_name}</div>
              <div style="font-size:11px;color:var(--mu)">${wc?wc.name:'—'} · ${b.collection_date?dF(b.collection_date):'No date'}</div>
              ${b.reference?`<div style="font-size:11px;color:var(--mu)">Ref: ${b.reference}</div>`:''}
            </div>
            <span class="b bb">Open</span>
          </div>
          <div style="font-size:12px;margin-bottom:9px;display:flex;gap:14px">
            <span>Invoices: <strong>${bSales.length}</strong></span>
            <span>Total: <strong>${nisF(bTotal)}</strong></span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-s btn-sm" onclick="viewWhlBatchInvoices('${b.id}')">📋 View</button>
            <button class="btn btn-s btn-sm" onclick="openEditWhlBatch('${b.id}')">✏️ Edit</button>
            <button class="btn btn-p btn-sm" onclick="closeWhlBatch('${b.id}')">✅ Close</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Closed history table
  const histEl=document.getElementById('whl-history-tbl');
  const histSearch=document.getElementById('whl-hist-search')?.value?.toLowerCase()||'';
  if(histEl){
    const filtered=closedWhl.filter(b=>
      !histSearch||
      (b.batch_name||'').toLowerCase().includes(histSearch)||
      (gWC(b.customer_id)?.name||'').toLowerCase().includes(histSearch)||
      (b.collection_date||'').includes(histSearch)
    );
    if(!filtered.length){
      histEl.innerHTML='<div style="padding:16px;text-align:center;color:var(--mu);font-size:12px">'+(closedWhl.length?'No results for "'+histSearch+'"':'No closed batches yet.')+'</div>';
    } else {
      histEl.innerHTML='<div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Batch Name</th><th>Customer</th><th>Invoices</th><th>Total</th><th></th></tr></thead><tbody>'+
        filtered.map(b=>{
          const wc=gWC(b.customer_id);
          const bSales=DB.sales.filter(s=>s.collection_batch_id===b.id&&!isRet(s));
          const bTotal=bSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
          return`<tr>
            <td>${b.collection_date?dF(b.collection_date):'—'}</td>
            <td><strong>${b.batch_name}</strong></td>
            <td>${wc?wc.name:'—'}</td>
            <td>${bSales.length}</td>
            <td>${nisF(bTotal)}</td>
            <td><button class="btn btn-s btn-sm" onclick="viewWhlBatchInvoices('${b.id}')">📋 View</button></td>
          </tr>`;
        }).join('')
        +'</tbody></table></div>';
    }
  }
  renderWhlPending();
}

// ── Pending wholesale credit sales table ──────────────────────────────
function renderWhlPending(){
  if(!DB.wholesale_batches)DB.wholesale_batches=[];
  const custFilter=document.getElementById('whl-cust-filter')?.value||'';
  let pnd=DB.sales.filter(s=>!isRet(s)&&s.payment_type==='Credit'&&!isColl(s.payment_status));
  if(custFilter)pnd=pnd.filter(s=>s.customer_id===custFilter);
  pnd.sort((a,b)=>String(a.date).localeCompare(String(b.date)));

  const openWhlBatches=DB.wholesale_batches.filter(b=>b.status==='Open');
  document.getElementById('whl-pending-title').textContent=`Pending Wholesale Credit Sales (${pnd.length})`;
  const asel=document.getElementById('whl-assign-sel');
  if(asel)asel.innerHTML='<option value="">Select open batch…</option>'+
    openWhlBatches.map(b=>{const wc=gWC(b.customer_id);return`<option value="${b.id}">${b.batch_name}${wc?' ('+wc.name+')':''}</option>`;}).join('');

  const el=document.getElementById('whl-pending-tbl');
  if(!pnd.length){
    el.innerHTML='<div style="padding:16px;text-align:center;color:var(--gn);font-size:12px">✅ No pending wholesale credit sales</div>';
    return;
  }
  el.innerHTML=`
    <div style="overflow-x:auto"><table><thead><tr>
      <th><input type="checkbox" onchange="toggleAllWhl(this)"></th>
      <th>Date</th><th>Customer</th><th>Product</th><th>Variant</th><th>Amount</th>
    </tr></thead><tbody>${
      pnd.map(s=>`<tr>
        <td><input type="checkbox" class="whl-check" data-sid="${s.id}" data-amt="${(+s.unit_price||0)*(+s.qty||1)}" onchange="updateWhlSum()" style="width:16px;height:16px"></td>
        <td>${dF(s.date)}</td>
        <td>${s.customer_name||s.customer||'—'}</td>
        <td>${pN(s.product_id)||'—'}</td>
        <td>${s.variant_label||'—'}</td>
        <td><strong>${nisF((+s.unit_price||0)*(+s.qty||1))}</strong></td>
      </tr>`).join('')
    }</tbody></table></div>
    <div id="whl-live-sum" style="padding:12px 14px;background:var(--nv);color:#fff;border-radius:0 0 8px 8px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div style="font-size:13px">
        Selected: <strong id="whl-sum-count">0</strong> invoices &nbsp;·&nbsp;
        Total: <strong id="whl-sum-total" style="font-size:15px;color:var(--gd)">₪0</strong>
      </div>
      <div style="display:flex;gap:7px;align-items:center">
        <span style="font-size:11px;opacity:.7">Assign to:</span>
        ${openWhlBatches.map(b=>{const wc=gWC(b.customer_id);return`<button class="btn btn-sm" style="background:var(--gd);color:#fff;border:none;cursor:pointer;padding:6px 12px" onclick="assignToWhlBatch('${b.id}')">✅ ${b.batch_name}${wc?' ('+wc.name+')':''}</button>`;}).join('')}
        ${!openWhlBatches.length?'<span style="font-size:11px;opacity:.7">Create a batch first</span>':''}
      </div>
    </div>`;
}

function toggleAllWhl(master){
  document.querySelectorAll('.whl-check').forEach(c=>c.checked=master.checked);
  updateWhlSum();
}
function updateWhlSum(){
  const checks=[...document.querySelectorAll('.whl-check:checked')];
  const total=checks.reduce((a,c)=>a+parseFloat(c.dataset.amt||0),0);
  const cnt=document.getElementById('whl-sum-count');
  const tot=document.getElementById('whl-sum-total');
  if(cnt)cnt.textContent=checks.length;
  if(tot)tot.textContent=nisF(total);
}

// ── Assign checked to wholesale batch ────────────────────────────────
function assignToWhlBatch(batchId){
  if(!DB.wholesale_batches)DB.wholesale_batches=[];
  const b=DB.wholesale_batches.find(x=>x.id===batchId);if(!b){alert('Batch not found.');return;}
  const checked=[...document.querySelectorAll('.whl-check:checked')].map(x=>x.dataset.sid);
  if(!checked.length){alert('No sales selected.');return;}
  if(!confirm(`Assign ${checked.length} invoices to "${b.batch_name}"?`))return;
  checked.forEach(sid=>{
    const s=DB.sales.find(x=>x.id===sid);if(!s)return;
    s.collection_batch_id=batchId;
    dbUpdate('sales', s.id, s);
  });
  renderWhlColBatches();
}

// ── Close wholesale batch → mark all as Collected ────────────────────
function closeWhlBatch(batchId){
  if(!DB.wholesale_batches)DB.wholesale_batches=[];
  const b=DB.wholesale_batches.find(x=>x.id===batchId);if(!b)return;
  const bSales=DB.sales.filter(s=>s.collection_batch_id===batchId&&!isRet(s)&&!isColl(s.payment_status));
  if(!bSales.length){
    if(!confirm(`No pending invoices in this batch. Close it anyway?`))return;
  } else {
    if(!confirm(`Close "${b.batch_name}" and mark ${bSales.length} invoices as Collected on ${b.collection_date?dF(b.collection_date):'today'}?`))return;
  }
  const collDate=b.collection_date||tod();
  let total=0;
  bSales.forEach(s=>{
    s.payment_status='Collected';
    s.collection_date=collDate;
    total+=(+s.unit_price||0)*(+s.qty||1);
    dbUpdate('sales', s.id, s);
  });
  // Include already-collected sales in total
  const allBatchSales=DB.sales.filter(s=>s.collection_batch_id===batchId&&!isRet(s));
  const fullTotal=allBatchSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  b.status='Closed';b.total_amount=fullTotal;b.invoice_count=allBatchSales.length;
  dbUpdate('wholesale_batches', b.id, b);
  renderWhlColBatches();renderWholesale();renderDash();
  alert(`✅ Batch closed. ${bSales.length} invoices marked Collected · Total: ${nisF(fullTotal)}`);
}

// ── View invoices in wholesale batch ─────────────────────────────────
function viewWhlBatchInvoices(batchId){
  if(!DB.wholesale_batches)DB.wholesale_batches=[];
  const b=DB.wholesale_batches.find(x=>x.id===batchId);if(!b)return;
  const wc=gWC(b.customer_id);
  const sales=DB.sales.filter(s=>s.collection_batch_id===batchId&&!isRet(s));
  const total=sales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  document.getElementById('cb-inv-title').textContent=`Invoices in: ${b.batch_name}`;
  document.getElementById('cb-inv-summary').innerHTML=
    `<span>Customer: <strong>${wc?wc.name:'—'}</strong></span>
     <span>Status: <strong class="b ${b.status==='Open'?'bb':'bg'}">${b.status}</strong></span>
     <span>Date: <strong>${b.collection_date?dF(b.collection_date):'—'}</strong></span>
     ${b.reference?`<span>Ref: <strong>${b.reference}</strong></span>`:''}
     <span>Invoices: <strong>${sales.length}</strong></span>
     <span>Total: <strong style="color:var(--gn)">${nisF(total)}</strong></span>`;
  document.getElementById('cb-inv-tbl').innerHTML = sales.length
    ? tbl(sales.sort((a,c)=>String(a.date).localeCompare(String(c.date))).map(s=>({
        'Date':dF(s.date),
        'Product':pN(s.product_id)||'—',
        'Variant':s.variant_label||'—',
        'Amount':nisF((+s.unit_price||0)*(+s.qty||1)),
        'Status':pBadge(s.payment_status),
        'Coll. Date':s.collection_date?dF(s.collection_date):'—'
      })),false)
    : '<div style="padding:14px;text-align:center;color:var(--mu);font-size:12px">No invoices assigned yet.</div>';
  openM('m-cb-invoices');
}

// ════ SUPPLIER PAYMENT BATCHES ════════════════════════════════════════

function supTab(i, el){
  document.querySelectorAll('#sup-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('sup-t-main').style.display    = i===0?'block':'none';
  document.getElementById('sup-t-batches').style.display = i===1?'block':'none';
  if(i===1) renderSupBatches();
}

function openNewSupBatch(){
  if(!(DB.suppliers||[]).length){alert('No suppliers defined yet.');return;}
  document.getElementById('sup-batch-modal-title').textContent='New Supplier Payment Batch';
  document.getElementById('sup-batch-edit-id').value='';
  ['sup-batch-name','sup-batch-ref','sup-batch-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('sup-batch-date').value=tod();
  document.getElementById('sup-batch-amount').value='';
  const sel=document.getElementById('sup-batch-sup-id');
  sel.innerHTML='<option value="">— select —</option>'+(DB.suppliers||[]).map(s=>`<option value="${s.id}">${s.name} (${s.type})</option>`).join('');
  document.getElementById('sup-batch-bal').textContent='';
  openM('m-sup-batch');
}
function openEditSupBatch(id){
  if(!DB.supplier_batches)DB.supplier_batches=[];
  const b=DB.supplier_batches.find(x=>x.id===id);if(!b)return;
  document.getElementById('sup-batch-modal-title').textContent='Edit Payment Batch';
  document.getElementById('sup-batch-edit-id').value=id;
  document.getElementById('sup-batch-name').value=b.batch_name||'';
  document.getElementById('sup-batch-date').value=b.payment_date||'';
  document.getElementById('sup-batch-ref').value=b.reference||'';
  document.getElementById('sup-batch-amount').value=b.amount_nis||'';
  document.getElementById('sup-batch-notes').value=b.notes||'';
  const sel=document.getElementById('sup-batch-sup-id');
  sel.innerHTML='<option value="">— select —</option>'+(DB.suppliers||[]).map(s=>`<option value="${s.id}">${s.name} (${s.type})</option>`).join('');
  sel.value=b.supplier_id||'';
  onSupBatchSupChange();
  openM('m-sup-batch');
}
function onSupBatchSupChange(){
  const id=document.getElementById('sup-batch-sup-id').value;
  const el=document.getElementById('sup-batch-bal');if(!el)return;
  if(!id){el.textContent='';return;}
  const bal=getSupBal(id);
  el.innerHTML=`Outstanding balance: <strong style="color:${bal>0?'var(--rd)':'var(--gn)'}">${nisF(bal)}</strong>`;
}
async function saveSupBatch(){
  const name=document.getElementById('sup-batch-name').value.trim();
  const supId=document.getElementById('sup-batch-sup-id').value;
  if(!name){alert('Enter batch name.');return;}
  if(!supId){alert('Select a supplier.');return;}
  if(!DB.supplier_batches)DB.supplier_batches=[];
  const editId=document.getElementById('sup-batch-edit-id').value;
  const row={id:editId||uid(),batch_name:name,supplier_id:supId,
    payment_date:document.getElementById('sup-batch-date').value,
    reference:document.getElementById('sup-batch-ref').value,
    amount_nis:parseFloat(document.getElementById('sup-batch-amount').value)||0,
    notes:document.getElementById('sup-batch-notes').value,
    total_paid:0,purchase_count:0,status:'Open'};
  if(editId){
    const idx=DB.supplier_batches.findIndex(x=>x.id===editId);
    if(idx>=0)DB.supplier_batches[idx]={...DB.supplier_batches[idx],...row};
    await dbUpdate('supplier_batches', editId, row);
  } else {
    DB.supplier_batches.push(row);
    await dbInsert('supplier_batches', row);
  }
  closeM('m-sup-batch');renderSupBatches();
}

function renderSupBatches(){
  if(!DB.supplier_batches)DB.supplier_batches=[];
  // Populate filter
  const fSel=document.getElementById('sup-batch-filter');
  if(fSel){const cur=fSel.value;fSel.innerHTML='<option value="">All Suppliers</option>'+(DB.suppliers||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');fSel.value=cur;}
  const supFilter=document.getElementById('sup-batch-filter')?.value||'';
  const cards=document.getElementById('sup-batch-cards');
  let batches=[...DB.supplier_batches].sort((a,b)=>String(b.payment_date||'').localeCompare(String(a.payment_date||'')));
  if(supFilter)batches=batches.filter(b=>b.supplier_id===supFilter);
  if(!batches.length){
    cards.innerHTML='<div style="color:var(--mu);font-size:12px;padding:10px">No payment batches yet.</div>';
  } else {
    cards.innerHTML=batches.map(b=>{
      const isOpen=b.status==='Open';
      const sup=gSup(b.supplier_id);
      // Count assigned purchases
      const bPurs=(DB.purchases||[]).filter(p=>p.payment_batch_id===b.id);
      const bTotal=bPurs.reduce((a,p)=>a+(+p.total_cost||0)||(+p.unit_cost||0)*(+p.qty||0),0);
      return`<div class="kc" style="border-top:3px solid ${isOpen?'var(--or)':'var(--gn)'}">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:7px">
          <div>
            <div style="font-weight:700;font-size:13px">${b.batch_name}</div>
            <div style="font-size:11px;color:var(--mu)">${sup?sup.name:'—'} · ${b.payment_date?dF(b.payment_date):'No date'}</div>
            ${b.reference?`<div style="font-size:11px;color:var(--mu)">Ref: ${b.reference}</div>`:''}
          </div>
          <span class="b ${isOpen?'bo':'bg'}">${b.status}</span>
        </div>
        <div style="font-size:12px;margin-bottom:9px">
          <div style="display:flex;justify-content:space-between">
            <span>Transfer sent: <strong>${nisF(b.amount_nis||0)}</strong></span>
            <span>Assigned: <strong>${nisF(bTotal)}</strong></span>
          </div>
          ${b.amount_nis>0?`<div style="margin-top:4px;height:5px;background:var(--bd);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${Math.min(bTotal/(b.amount_nis||1)*100,100).toFixed(1)}%;background:${bTotal>b.amount_nis?'var(--rd)':'var(--gn)'};border-radius:3px"></div>
          </div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-s btn-sm" onclick="viewSupBatchPurchases('${b.id}')">📋 View</button>
          <button class="btn btn-s btn-sm" onclick="openEditSupBatch('${b.id}')">✏️ Edit</button>
          ${isOpen?`<button class="btn btn-p btn-sm" onclick="closeSupBatch('${b.id}')">✅ Close Batch</button>`:''}
        </div>
      </div>`;
    }).join('');
  }
  renderSupPending();
}

function renderSupPending(){
  if(!DB.supplier_batches)DB.supplier_batches=[];
  const supFilter=document.getElementById('sup-batch-filter')?.value||'';
  let pnd=(DB.purchases||[]).filter(p=>!p.payment_batch_id&&p.status!=='Paid');
  if(supFilter)pnd=pnd.filter(p=>p.supplier_id===supFilter);
  pnd.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));

  const openBatches=DB.supplier_batches.filter(b=>b.status==='Open');
  const asel=document.getElementById('sup-batch-assign-sel');
  if(asel)asel.innerHTML='<option value="">Select open batch…</option>'+
    openBatches.map(b=>{const s=gSup(b.supplier_id);return`<option value="${b.id}">${b.batch_name}${s?' ('+s.name+')':''}</option>`;}).join('');

  document.getElementById('sup-pend-title').textContent=`Pending Purchases (${pnd.length})`;
  const el=document.getElementById('sup-pending-tbl');
  if(!pnd.length){
    el.innerHTML='<div style="padding:16px;text-align:center;color:var(--gn);font-size:12px">✅ No pending unpaid purchases</div>';return;
  }
  el.innerHTML=`
    <div style="overflow-x:auto"><table><thead><tr>
      <th><input type="checkbox" onchange="toggleAllSupPur(this)"></th>
      <th>Date</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Total</th>
    </tr></thead><tbody>${
      pnd.map(p=>{
        const tot=(+p.total_cost||0)||((+p.unit_cost||0)*(+p.qty||0));
        return`<tr>
          <td><input type="checkbox" class="sup-pur-check" data-pid="${p.id}" data-amt="${tot}" onchange="updateSupPurSum()" style="width:16px;height:16px"></td>
          <td>${dF(p.date)}</td>
          <td>${(gSup(p.supplier_id)||{}).name||'—'}</td>
          <td>${pN(p.product_id)||'—'}</td>
          <td>${p.qty||0}</td>
          <td><strong>${nisF(tot)}</strong></td>
        </tr>`;
      }).join('')
    }</tbody></table></div>
    <div id="sup-live-sum" style="padding:12px 14px;background:var(--nv);color:#fff;border-radius:0 0 8px 8px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div style="font-size:13px">
        Selected: <strong id="sup-sum-count">0</strong> purchases &nbsp;·&nbsp;
        Total: <strong id="sup-sum-total" style="font-size:15px;color:var(--gd)">₪0</strong>
      </div>
      <div style="display:flex;gap:7px;align-items:center">
        <span style="font-size:11px;opacity:.7">Assign to:</span>
        ${openBatches.map(b=>{const s=gSup(b.supplier_id);return`<button class="btn btn-sm" style="background:var(--gd);color:#fff;border:none;cursor:pointer;padding:6px 12px" onclick="assignToSupBatch('${b.id}')">✅ ${b.batch_name}${s?' ('+s.name+')':''}</button>`;}).join('')}
        ${!openBatches.length?'<span style="font-size:11px;opacity:.7">Create a batch first</span>':''}
      </div>
    </div>`;
}
function toggleAllSupPur(master){
  document.querySelectorAll('.sup-pur-check').forEach(c=>c.checked=master.checked);
  updateSupPurSum();
}
function updateSupPurSum(){
  const checks=[...document.querySelectorAll('.sup-pur-check:checked')];
  const total=checks.reduce((a,c)=>a+parseFloat(c.dataset.amt||0),0);
  const cnt=document.getElementById('sup-sum-count');const tot=document.getElementById('sup-sum-total');
  if(cnt)cnt.textContent=checks.length;if(tot)tot.textContent=nisF(total);
}
function assignToSupBatch(batchId){
  if(!DB.supplier_batches)DB.supplier_batches=[];
  const b=DB.supplier_batches.find(x=>x.id===batchId);if(!b){alert('Batch not found.');return;}
  const checked=[...document.querySelectorAll('.sup-pur-check:checked')].map(x=>x.dataset.pid);
  if(!checked.length){alert('No purchases selected.');return;}
  if(!confirm(`Assign ${checked.length} purchases to "${b.batch_name}"?`))return;
  checked.forEach(pid=>{
    const p=(DB.purchases||[]).find(x=>x.id===pid);if(!p)return;
    p.payment_batch_id=batchId;
    dbUpdate('purchases', p.id, p);
  });
  renderSupBatches();
}
function closeSupBatch(batchId){
  if(!DB.supplier_batches)DB.supplier_batches=[];
  const b=DB.supplier_batches.find(x=>x.id===batchId);if(!b)return;
  const sup=gSup(b.supplier_id);
  const assigned=(DB.purchases||[]).filter(p=>p.payment_batch_id===batchId&&p.status!=='Paid');
  const allAssigned=(DB.purchases||[]).filter(p=>p.payment_batch_id===batchId);
  if(!allAssigned.length){alert('No purchases assigned to this batch yet.');return;}
  const total=allAssigned.reduce((a,p)=>a+(+p.total_cost||0)||(+p.unit_cost||0)*(+p.qty||0),0);
  const payDate=b.payment_date||tod();
  if(!confirm(`Close "${b.batch_name}"?\n\nMark ${assigned.length} purchases as Paid.\nRecord payment of ${nisF(total)} to ${sup?sup.name:'supplier'} on ${dF(payDate)}.`))return;
  // Mark purchases as Paid
  assigned.forEach(p=>{
    p.status='Paid';p.paid_date=payDate;
    dbUpdate('purchases', p.id, p);
  });
  // Record supplier payment
  const payment={id:uid(),supplier_id:b.supplier_id,date:payDate,
    amount_nis:total,amount_usd:0,
    remark:`Payment Batch: ${b.batch_name}${b.reference?' · Ref: '+b.reference:''}`};
  if(!DB.supplier_payments)DB.supplier_payments=[];
  DB.supplier_payments.push(payment);
  dbInsert('supplier_payments', payment);
  // Close batch
  b.status='Closed';b.total_paid=total;b.purchase_count=allAssigned.length;
  renderSupBatches();renderSuppliers();renderDash();
  alert(`✅ Batch closed. ${nisF(total)} recorded as paid to ${sup?sup.name:'supplier'}.`);
}
function viewSupBatchPurchases(batchId){
  if(!DB.supplier_batches)DB.supplier_batches=[];
  const b=DB.supplier_batches.find(x=>x.id===batchId);if(!b)return;
  const sup=gSup(b.supplier_id);
  const purs=(DB.purchases||[]).filter(p=>p.payment_batch_id===batchId);
  const total=purs.reduce((a,p)=>a+(+p.total_cost||0)||(+p.unit_cost||0)*(+p.qty||0),0);
  document.getElementById('cb-inv-title').textContent=`Purchases in: ${b.batch_name}`;
  document.getElementById('cb-inv-summary').innerHTML=
    `<span>Supplier: <strong>${sup?sup.name:'—'}</strong></span>
     <span>Status: <strong class="b ${b.status==='Open'?'bo':'bg'}">${b.status}</strong></span>
     <span>Date: <strong>${b.payment_date?dF(b.payment_date):'—'}</strong></span>
     ${b.reference?`<span>Ref: <strong>${b.reference}</strong></span>`:''}
     <span>Purchases: <strong>${purs.length}</strong></span>
     <span>Total: <strong style="color:var(--rd)">${nisF(total)}</strong></span>
     <span>Transfer sent: <strong style="color:var(--bl)">${nisF(b.amount_nis||0)}</strong></span>`;
  document.getElementById('cb-inv-tbl').innerHTML=purs.length
    ? tbl(purs.map(p=>({
        'Date':dF(p.date),'Product':pN(p.product_id)||'—','Qty':p.qty||0,
        'Unit Cost':nisF(+p.unit_cost||0),'Total':nisF((+p.total_cost||0)||((+p.unit_cost||0)*(+p.qty||0))),
        'Status':`<span class="b ${p.status==='Paid'?'bg':'bo'}">${p.status||'Pending'}</span>`
      })),false)
    : '<div style="padding:14px;text-align:center;color:var(--mu);font-size:12px">No purchases assigned yet.</div>';
  openM('m-cb-invoices');
}

// ════ STOCK ADJUSTMENT ════════════════════════════════════════════════
function openStockAdj(){
  if(!isAdmin()){alert('Admin access required for stock adjustments.');return;}
  populateSels();
  // Populate product select
  const pSel=document.getElementById('sa-prod');
  if(pSel)pSel.innerHTML='<option value="">— select product —</option>'+DB.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  document.getElementById('sa-var').innerHTML='<option value="">— select product first —</option>';
  document.getElementById('sa-current').value='';
  document.getElementById('sa-writeoff').value=1;
  document.getElementById('sa-preview').textContent='';
  document.getElementById('sa-notes').value='';
  openM('m-stockadj');
}
function onSAProdChange(){
  const pid=document.getElementById('sa-prod').value;
  const vSel=document.getElementById('sa-var');
  vSel.innerHTML='<option value="">— select variant —</option>'+
    DB.variants.filter(v=>v.product_id===pid).map(v=>`<option value="${v.id}">${vLabel(v)} (${getStock(v.id)} units)</option>`).join('');
  document.getElementById('sa-current').value='';
  document.getElementById('sa-preview').textContent='';
}
function onSAVarChange(){
  const vid=document.getElementById('sa-var').value;
  if(!vid){document.getElementById('sa-current').value='';return;}
  const stk=getStock(vid);
  document.getElementById('sa-current').value=stk;
  updateSAPreview();
}
function updateSAPreview(){
  const vid=document.getElementById('sa-var').value;if(!vid)return;
  const stk=getStock(vid);
  const qty=+(document.getElementById('sa-writeoff').value||0);
  const cost=getFifoCost(vid);
  const el=document.getElementById('sa-preview');
  if(qty>stk){el.textContent=`⚠️ Cannot write off more than ${stk} units in stock`;el.style.color='var(--rd)';return;}
  el.textContent=`After adjustment: ${stk-qty} units remaining · Write-off value: ${nisF(qty*cost)}`;
  el.style.color='var(--mu)';
}
function doStockAdj(){
  const vid=document.getElementById('sa-var').value;
  const qty=+(document.getElementById('sa-writeoff').value||0);
  const reason=document.getElementById('sa-reason').value;
  const notes=document.getElementById('sa-notes').value;
  if(!vid){alert('Select a variant.');return;}
  if(!qty||qty<1){alert('Enter quantity to write off.');return;}
  const stk=getStock(vid);
  if(qty>stk){alert(`Only ${stk} units in stock. Cannot write off ${qty}.`);return;}
  const cost=getFifoCost(vid);
  const writeOffValue=qty*cost;
  const v=gV(vid);const p=gP(v?.product_id);
  if(!confirm(`Write off ${qty} unit(s) of ${p?.name||'—'} (${vLabel(v)})?

Reason: ${reason}
FIFO value written off: ${nisF(writeOffValue)}
Stock after: ${stk-qty} units

This cannot be undone.`))return;
  // Deduct from FIFO
  fifoDeduct(vid, qty);
  // Record as an expense for the write-off value
  const expRow={id:uid(),date:tod(),desc:`Stock Write-off: ${p?.name||'—'} · ${vLabel(v)} · ${qty} unit(s) · ${reason}`,
    category:'Stock Write-off',amount:writeOffValue,project:'',supplier_id:''};
  if(!DB.expenses)DB.expenses=[];
  DB.expenses.push(expRow);
  dbInsert('expenses', expRow);
  closeM('m-stockadj');
  renderInv();renderDash();
  alert(`✅ Done. ${qty} unit(s) written off. Value ${nisF(writeOffValue)} recorded as Stock Write-off expense.`);
}

// ════ RECEIVE SHIPMENT BATCH ════════════════════════════════════════
function openReceiveBatch(bid){
  const b=DB.batches.find(x=>x.id===bid);if(!b)return;
  document.getElementById('rb-id').value=bid;
  document.getElementById('rb-code').value=b.shipment_code||bid;
  document.getElementById('rb-date').value=tod();
  document.getElementById('rb-qty').value=b.qty_received||1;
  document.getElementById('rb-notes').value='';
  openM('m-receive-batch');
}
function receiveBatch(){
  const bid=document.getElementById('rb-id').value;
  const b=DB.batches.find(x=>x.id===bid);if(!b)return;
  const qty=+(document.getElementById('rb-qty').value||0);
  if(!qty||qty<1){alert('Enter the quantity received.');return;}
  const date=document.getElementById('rb-date').value||tod();
  if(!confirm(`Mark "${b.shipment_code}" as Received?\n\nQty: ${qty} units\nDate: ${dF(date)}\n\nDon't forget to add cost lines (purchase, shipping, customs) to calculate the unit cost.`))return;
  b.status='Active';
  b.qty_received=qty;
  b.qty_remaining=qty;
  b.shipment_date=date;
  dbUpdate('batches', b.id, b);
  closeM('m-receive-batch');
  // Refresh inventory view
  renderInv();
  if(document.getElementById('inv-t1')?.style.display!=='none')renderStockCards();
  alert(`✅ "${b.shipment_code}" is now Active with ${qty} units.\nGo to Stock Cards → add Cost Lines to set the unit cost.`);
}


function openNewMultiBatch(){
  _nbSplitSourceBatchId=null;
  document.getElementById('nb-modal-title').textContent='New Multi-variant Shipment';
  document.getElementById('nb-code').value='';
  document.getElementById('nb-date').value=tod();
  document.getElementById('nb-status').value='Active';
  ['nb-cost-usd','nb-ship-usd','nb-customs-usd','nb-total-nis'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('nb-rate').value='3.7';
  const supSel=document.getElementById('nb-sup');
  if(supSel)supSel.innerHTML='<option value="">— select —</option>'+(DB.suppliers||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('nb-variant-rows').innerHTML='';
  nbSetSplit('unit');
  nbAddRow();
  nbUpdateSummary();
  openM('m-newbatch');
}
function openSplitBatch(bid){
  const b=DB.batches.find(x=>x.id===bid);if(!b)return;
  _nbSplitSourceBatchId=bid;
  document.getElementById('nb-modal-title').textContent='Split/Allocate: '+b.shipment_code;
  document.getElementById('nb-code').value=b.shipment_code;
  document.getElementById('nb-date').value=b.shipment_date||tod();
  document.getElementById('nb-status').value=b.status||'Active';
  const costs=DB.stock_costs.filter(c=>c.batch_id===bid);
  const totalNis=costs.reduce((a,c)=>a+(+c.amount_nis||0),0);
  ['nb-cost-usd','nb-ship-usd','nb-customs-usd'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('nb-total-nis').value=totalNis||b.total_cost_nis||'';
  document.getElementById('nb-rate').value='3.7';
  const supSel=document.getElementById('nb-sup');
  if(supSel){supSel.innerHTML='<option value="">— select —</option>'+(DB.suppliers||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');supSel.value=b.supplier_id||'';}
  document.getElementById('nb-variant-rows').innerHTML='';
  nbSetSplit('unit');
  if(b.variant_id)nbAddRow(b.variant_id,b.qty_remaining);else nbAddRow();
  nbUpdateSummary();
  openM('m-newbatch');
}
function nbSetSplit(mode){
  _nbSplitMode=mode;
  const ub=document.getElementById('nb-split-unit');
  const pb=document.getElementById('nb-split-pct');
  const ph=document.getElementById('nb-pct-hdr');
  if(mode==='unit'){
    if(ub){ub.style.borderColor='var(--gd)';ub.style.background='var(--gd)';ub.style.color='#fff';}
    if(pb){pb.style.borderColor='var(--bd)';pb.style.background='var(--bg)';pb.style.color='var(--mu)';}
    if(ph)ph.style.display='none';
    document.querySelectorAll('.nb-pct-wrap').forEach(e=>e.style.display='none');
  }else{
    if(pb){pb.style.borderColor='var(--gd)';pb.style.background='var(--gd)';pb.style.color='#fff';}
    if(ub){ub.style.borderColor='var(--bd)';ub.style.background='var(--bg)';ub.style.color='var(--mu)';}
    if(ph)ph.style.display='';
    document.querySelectorAll('.nb-pct-wrap').forEach(e=>e.style.display='');
  }
  nbCalcSplit();
}
function nbCalcNIS(){
  const c=+(document.getElementById('nb-cost-usd').value||0);
  const s=+(document.getElementById('nb-ship-usd').value||0);
  const cu=+(document.getElementById('nb-customs-usd').value||0);
  const r=+(document.getElementById('nb-rate').value||3.7);
  document.getElementById('nb-total-nis').value=((c+s+cu)*r).toFixed(2);
  nbCalcSplit();
}
function nbCalcSplit(){
  const totalNis=+(document.getElementById('nb-total-nis').value||0);
  const rows=[...document.querySelectorAll('.nb-row')];
  if(!rows.length){nbUpdateSummary();return;}
  const totalUnits=rows.reduce((a,r)=>a+(+(r.querySelector('.nb-qty').value||0)),0);
  rows.forEach(r=>{
    const qty=+(r.querySelector('.nb-qty').value||0);
    let unitCost=0;
    let rowTotal=0;
    if(_nbSplitMode==='unit'){
      unitCost=totalUnits>0?totalNis/totalUnits:0;
      rowTotal=qty*unitCost;
    }else{
      const pct=+(r.querySelector('.nb-pct-input').value||0);
      const share=totalNis*(pct/100);
      unitCost=qty>0?share/qty:0;
      rowTotal=share;
    }
    r.querySelector('.nb-unit-cost').value=unitCost.toFixed(4);
    r.querySelector('.nb-row-total').textContent=nisF(rowTotal);
  });
  nbUpdateSummary();
}
function nbUpdateSummary(){
  const rows=[...document.querySelectorAll('.nb-row')];
  const totalUnits=rows.reduce((a,r)=>a+(+(r.querySelector('.nb-qty').value||0)),0);
  const totalNis=+(document.getElementById('nb-total-nis').value||0);
  const cnt=document.getElementById('nb-total-units');if(cnt)cnt.textContent=totalUnits;
  const sc=document.getElementById('nb-summary-cost');if(sc)sc.textContent=nisF(totalNis);
  const ac=document.getElementById('nb-avg-cost');if(ac)ac.textContent=totalUnits>0?nisF(totalNis/totalUnits):'₪0';
}
function nbAddRow(preVid,preQty){
  const container=document.getElementById('nb-variant-rows');
  const rowId='nbr'+Date.now()+Math.floor(Math.random()*999);
  const varOpts=DB.variants.map(v=>`<option value="${v.id}"${v.id===preVid?' selected':''}>${pN(v.product_id)||'—'} · ${vLabel(v)}</option>`).join('');
  const pctDisplay=_nbSplitMode==='pct'?'':'display:none';
  const div=document.createElement('div');
  div.className='nb-row';div.id=rowId;
  div.style.cssText='display:grid;grid-template-columns:2fr 1fr 70px 90px 1fr 28px;gap:6px;align-items:center;margin-bottom:5px;padding:6px 4px;background:var(--bg);border-radius:6px';
  div.innerHTML=`<select class="nb-var-sel" onchange="nbCalcSplit()" style="padding:6px 8px;border:1px solid var(--bd);border-radius:6px;font-size:12px"><option value="">— select variant —</option>${varOpts}</select>`+
    `<input type="number" class="nb-qty" value="${preQty||1}" min="0" oninput="nbCalcSplit()" style="padding:6px 8px;border:1px solid var(--bd);border-radius:6px;font-size:12px">`+
    `<div class="nb-pct-wrap" style="${pctDisplay}"><input type="number" class="nb-pct-input" value="0" min="0" max="100" oninput="nbCalcSplit()" style="width:100%;padding:6px 8px;border:1px solid var(--bd);border-radius:6px;font-size:12px"></div>`+
    `<input type="number" class="nb-unit-cost" readonly style="padding:6px 8px;border:1px solid var(--bd);border-radius:6px;font-size:12px;background:var(--bg);color:var(--mu)">`+
    `<span class="nb-row-total" style="font-size:12px;font-weight:600;text-align:right;color:var(--nv)">₪0</span>`+
    `<button type="button" onclick="document.getElementById('${rowId}').remove();nbCalcSplit();" style="width:26px;height:26px;border:none;background:var(--rbg);color:var(--rd);border-radius:6px;cursor:pointer;font-size:14px">✕</button>`;
  container.appendChild(div);
  nbCalcSplit();
}
async function saveMultiBatch(){
  const code=document.getElementById('nb-code').value.trim();
  const date=document.getElementById('nb-date').value;
  const status=document.getElementById('nb-status').value;
  const supId=document.getElementById('nb-sup').value;
  const totalNis=+(document.getElementById('nb-total-nis').value||0);
  const costUsd=+(document.getElementById('nb-cost-usd').value||0);
  const shipUsd=+(document.getElementById('nb-ship-usd').value||0);
  const custUsd=+(document.getElementById('nb-customs-usd').value||0);
  const rate=+(document.getElementById('nb-rate').value||3.7);
  if(!code){alert('Enter a shipment code.');return;}
  const rows=[...document.querySelectorAll('.nb-row')];
  if(!rows.length){alert('Add at least one variant.');return;}
  const variantData=rows.map(r=>({
    vid:r.querySelector('.nb-var-sel').value,
    qty:+(r.querySelector('.nb-qty').value||0),
    pct:+(r.querySelector('.nb-pct-input').value||0),
    unitCost:+(r.querySelector('.nb-unit-cost').value||0)
  })).filter(r=>r.vid&&r.qty>0);
  if(!variantData.length){alert('Each row needs a variant and qty > 0.');return;}
  if(_nbSplitMode==='pct'){
    const tp=variantData.reduce((a,r)=>a+r.pct,0);
    if(Math.abs(tp-100)>0.1){alert('Percentages must total 100%. Currently: '+tp.toFixed(1)+'%');return;}
  }
  const totalUnits=variantData.reduce((a,r)=>a+r.qty,0);
  const lines=variantData.map(r=>`  ${vLabel(gV(r.vid))}: ${r.qty} units @ ${nisF(r.unitCost)}`).join('\n');
  if(!confirm(`Create ${variantData.length} batch(es) for "${code}"?\n\nTotal: ${totalUnits} units · ${nisF(totalNis)}\n${lines}`))return;
  // Deactivate source batch if splitting
  if(_nbSplitSourceBatchId){
    const src=DB.batches.find(x=>x.id===_nbSplitSourceBatchId);
    if(src){src.status='Depleted';src.qty_remaining=0;dbUpdate('batches', src.id, src);}
  }
  // Create one batch + cost lines per variant
  for(let _i=0;_i<variantData.length;_i++){const r=variantData[_i];const i=_i;
    const v=gV(r.vid);if(!v)continue;
    const unitShare=r.qty/totalUnits;
    const varShare=_nbSplitMode==='unit'?(r.qty*(totalNis/totalUnits)):(r.pct/100)*totalNis;
    const bId=uid();
    const batch={id:bId,variant_id:r.vid,product_id:v.product_id,supplier_id:supId||null,
      shipment_code:variantData.length===1?code:code+'-'+String(i+1).padStart(2,'0'),
      shipment_date:date||null,qty_received:r.qty,qty_remaining:r.qty,
      status,total_cost_usd:(costUsd+shipUsd+custUsd)*unitShare,
      total_cost_nis:varShare,unit_cost_nis:r.unitCost};
    DB.batches.push(batch);
    // Build cost lines
    const costLines=[];
    const mkCL=(type,amtUsd,amtNis)=>{if(!amtNis||amtNis<=0)return;
      const cl={id:uid(),batch_id:bId,variant_id:r.vid,product_id:v.product_id,
        cost_type:type,payment_date:date||null,amount_usd:amtUsd,amount_nis:amtNis,
        remark:type+' for '+vLabel(v)};
      DB.stock_costs.push(cl);costLines.push(cl);};
    mkCL('Purchase',costUsd*unitShare,costUsd*unitShare*rate);
    mkCL('Shipping',shipUsd*unitShare,shipUsd*unitShare*rate);
    mkCL('Customs',custUsd*unitShare,custUsd*unitShare*rate);
    // Insert batch + cost lines atomically via Edge Function
    await callFn('data-write',{action:'insert_batch_with_costs',batch,cost_lines:costLines});
  }
  // Update variant stock quantities in Supabase
  const updatedVariants = new Set(variantData.map(r=>r.vid));
  for(const vid of updatedVariants){
    const newStock=getStock(vid);const vv=gV(vid);
    if(vv){vv.stock_qty=newStock;await dbUpdate('variants',vid,{stock_qty:newStock,avg_cost_nis:getFifoCost(vid)||0});}
  }
  closeM('m-newbatch');
  renderInv();
  if(document.getElementById('inv-t1')&&document.getElementById('inv-t1').style.display!=='none')renderStockCards();
  renderDash();
  alert('Batch(es) created successfully.');
}
let _nbSplitMode='unit';
let _nbSplitSourceBatchId=null;

// ════ FINANCIAL REPORT ════════════════════════════════════════════════

function getDateFilter(){
  const p=document.getElementById('fin-period')?.value||'all';
  const now=new Date();
  if(p==='all')return{from:'',to:''};
  if(p==='month'){
    const f=new Date(now.getFullYear(),now.getMonth(),1);
    const t=new Date(now.getFullYear(),now.getMonth()+1,0);
    return{from:f.toISOString().split('T')[0],to:t.toISOString().split('T')[0]};
  }
  if(p==='quarter'){
    const q=Math.floor(now.getMonth()/3);
    const f=new Date(now.getFullYear(),q*3,1);
    const t=new Date(now.getFullYear(),q*3+3,0);
    return{from:f.toISOString().split('T')[0],to:t.toISOString().split('T')[0]};
  }
  if(p==='year'){
    return{from:now.getFullYear()+'-01-01',to:now.getFullYear()+'-12-31'};
  }
  return{from:'',to:''};
}

function filterByDate(items,dateField,from,to){
  return items.filter(x=>{
    const d=String(x[dateField]||'');
    if(from&&d<from)return false;
    if(to&&d>to)return false;
    return true;
  });
}

function renderFinancials(){
  if(!DB.fixed_assets)DB.fixed_assets=[];
  const{from,to}=getDateFilter();
  const period=document.getElementById('fin-period')?.value||'all';
  document.getElementById('fin-date-range').textContent=
    period==='all'?'All time':period==='month'?'This month':period==='quarter'?'This quarter':'This year';

  // ── SALES ──────────────────────────────────────────────────────────
  const allSales=DB.sales.filter(s=>!isRet(s));
  const perSales=from?filterByDate(allSales,'date',from,to):allSales;
  const revenue=perSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const cogs=perSales.filter(s=>isColl(s.payment_status)).reduce((a,s)=>a+(+s.unit_cost_nis||0)*(+s.qty||1),0);
  const collectedSales=perSales.filter(s=>isColl(s.payment_status));
  const collected=collectedSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const gp=collected-cogs;

  // ── EXPENSES ───────────────────────────────────────────────────────
  const allExp=DB.expenses.filter(e=>e.category!=='Stock Write-off'&&e.category!=='Stock Purchase');
  const perExp=from?filterByDate(allExp,'date',from,to):allExp;
  const opExp=perExp.reduce((a,e)=>a+(+e.amount||0),0);

  // Depreciation for period
  const depreciationForPeriod=calcTotalDepreciation(from,to);

  const totalExp=opExp+depreciationForPeriod;
  const netProfit=gp-totalExp;

  // ── CASH POSITION (always all-time for cash) ───────────────────────
  const openBal=parseFloat(getSetting('opening_balance')||'18792');
  const cashIn=DB.sales.filter(s=>!isRet(s)&&isColl(s.payment_status))
    .reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const cashExpOut=DB.expenses.filter(e=>e.category!=='Stock Write-off'&&e.category!=='Stock Purchase')
    .reduce((a,e)=>a+(+e.amount||0),0);
  const supPaidOut=DB.supplier_payments.reduce((a,p)=>a+(+p.amount_nis||0),0);
  const partnerPaidOut=DB.payments.reduce((a,p)=>a+(+p.amount||0),0);
  const availCash=openBal+cashIn-cashExpOut-supPaidOut-partnerPaidOut;

  // ── STOCK VALUE ────────────────────────────────────────────────────
  const stockCost=DB.variants.reduce((a,v)=>a+getStock(v.id)*getFifoCost(v.id),0);

  // ── FIXED ASSETS ───────────────────────────────────────────────────
  const faTotal=DB.fixed_assets.reduce((a,fa)=>a+(+fa.cost||0),0);
  const faAccDep=DB.fixed_assets.reduce((a,fa)=>a+calcAssetAccDep(fa),0);
  const faNBV=faTotal-faAccDep;

  // ── WC RECEIVABLES ─────────────────────────────────────────────────
  const wcReceivable=DB.wholesale_customers.reduce((a,c)=>a+getWCBal(c.id),0);

  // ── SUPPLIER PAYABLES ──────────────────────────────────────────────
  const supPayable=(DB.suppliers||[]).reduce((a,s)=>a+Math.max(0,getSupBal(s.id)),0);

  // ── RENDER KPIs ────────────────────────────────────────────────────
  document.getElementById('fin-cash-avail').textContent=nisF(availCash);
  document.getElementById('fin-cash-avail').style.color=availCash>=0?'var(--nv)':'var(--rd)';
  document.getElementById('fin-cash-breakdown').innerHTML=`
    <div style="font-weight:700;font-size:12px;margin-bottom:8px;color:var(--nv)">Cash Breakdown</div>
    <div style="display:flex;flex-direction:column;gap:5px">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--mu)">Opening Capital</span><strong>${nisF(openBal)}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gn)">+ Cash Collected</span><strong class="apos">${nisF(cashIn)}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--rd)">− Operating Expenses</span><strong class="aneg">${nisF(cashExpOut)}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--rd)">− Supplier Payments</span><strong class="aneg">${nisF(supPaidOut)}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--rd)">− Partner Payments</span><strong class="aneg">${nisF(partnerPaidOut)}</strong></div>
      <div style="border-top:1px solid var(--bd);padding-top:5px;margin-top:3px;display:flex;justify-content:space-between"><span style="font-weight:700">= Available Cash</span><strong style="color:${availCash>=0?'var(--gn)':'var(--rd)'};font-size:14px">${nisF(availCash)}</strong></div>
    </div>`;

  document.getElementById('fin-revenue').textContent=nisF(revenue);
  document.getElementById('fin-gp').textContent=nisF(gp);
  document.getElementById('fin-gp').style.color=gp>=0?'var(--gn)':'var(--rd)';
  document.getElementById('fin-gp-pct').textContent=collected>0?pctF(gp/collected)+' GP margin':'GP margin';
  document.getElementById('fin-exp').textContent=nisF(totalExp);
  document.getElementById('fin-np').textContent=nisF(netProfit);
  document.getElementById('fin-np').style.color=netProfit>=0?'var(--gn)':'var(--rd)';
  document.getElementById('fin-np-pct').textContent=revenue>0?pctF(netProfit/revenue)+' net margin':'net margin';
  document.getElementById('fin-np-card').style.borderTopColor=netProfit>=0?'var(--gn)':'var(--rd)';

  // P&L Detail table
  // Break down expenses by category
  const mktExp=perExp.filter(e=>e.category==='Marketing').reduce((a,e)=>a+(+e.amount||0),0);
  const opsExp=perExp.filter(e=>e.category==='Operations').reduce((a,e)=>a+(+e.amount||0),0);
  const otherExp=perExp.filter(e=>!['Marketing','Operations'].includes(e.category)).reduce((a,e)=>a+(+e.amount||0),0);
  const plRows=[
    {item:'Revenue (collected)',amount:collected,type:'income'},
    {item:'Cost of Goods Sold (FIFO)',amount:-cogs,type:'cogs'},
    {item:'── Gross Profit',amount:gp,type:'subtotal'},
    {item:'Marketing Expenses',amount:-mktExp,type:'expense'},
    {item:'Operations Expenses',amount:-opsExp,type:'expense'},
    {item:'Other Expenses',amount:-otherExp,type:'expense'},
    {item:'Depreciation',amount:-depreciationForPeriod,type:'expense'},
    {item:'── Net Profit',amount:netProfit,type:'subtotal'},
  ];
  document.getElementById('fin-pl-tbl').innerHTML=`<div style="overflow-x:auto"><table>
    <thead><tr><th>Item</th><th style="text-align:right">Amount (NIS)</th></tr></thead>
    <tbody>${plRows.map(r=>{
      const isSubtotal=r.item.startsWith('──');
      const color=r.amount>=0?'var(--gn)':'var(--rd)';
      return`<tr style="${isSubtotal?'border-top:2px solid var(--bd);font-weight:700;background:var(--bg)':''}">
        <td style="padding:7px 12px;font-size:12px">${r.item}</td>
        <td style="padding:7px 12px;text-align:right;font-size:12px;font-weight:${isSubtotal?700:400};color:${isSubtotal?color:'var(--tx)'}">${r.amount>=0?nisF(r.amount):'('+nisF(Math.abs(r.amount))+')'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;

  // ── BALANCE SHEET ──────────────────────────────────────────────────
  const totalAssets=availCash+stockCost+faNBV+wcReceivable;
  document.getElementById('fin-assets-total').textContent=nisF(totalAssets);
  document.getElementById('fin-assets-tbl').innerHTML=tbl([
    {'Asset':'Cash & Bank',Value:nisF(availCash),'%':pctF(availCash/totalAssets)},
    {'Asset':'Inventory (at FIFO cost)',Value:nisF(stockCost),'%':pctF(stockCost/totalAssets)},
    {'Asset':'WC Receivables',Value:nisF(wcReceivable),'%':pctF(wcReceivable/totalAssets)},
    {'Asset':'Fixed Assets (net)',Value:nisF(faNBV),'%':pctF(faNBV/totalAssets)},
    {'Asset':'── TOTAL ASSETS',Value:`<strong>${nisF(totalAssets)}</strong>`,'%':'100%'},
  ],false);

  // Equity & Liabilities
  const openCapital=openBal;
  const retainedEarnings=netProfit; // simplified: all-time net profit (when period=all)
  const equity=openCapital+(period==='all'?netProfit:0);
  document.getElementById('fin-equity-total').textContent=nisF(equity+supPayable);
  document.getElementById('fin-equity-tbl').innerHTML=tbl([
    {'Item':'Opening Capital',Value:nisF(openCapital)},
    {'Item':'Retained Earnings',Value:`<span style="color:${netProfit>=0?'var(--gn)':'var(--rd)'}">${nisF(period==='all'?netProfit:0)}</span>`},
    {'Item':'── Total Equity',Value:`<strong>${nisF(equity)}</strong>`},
    {'Item':'Supplier Payables',Value:`<span class="aneg">${nisF(supPayable)}</span>`},
    {'Item':'── TOTAL',Value:`<strong>${nisF(equity+supPayable)}</strong>`},
  ],false);

  // ── PARTNER EQUITY ─────────────────────────────────────────────────
  const partners=['Ammar','Saleem','Saed'];
  const partnerCount=3;
  const equityPerPartner=equity/partnerCount;
  document.getElementById('fin-partners').innerHTML=partners.map((name,i)=>{
    const drawn=DB.payments.filter(p=>p.partner===name).reduce((a,p)=>a+(+p.amount||0),0);
    const netEquity=equityPerPartner-drawn;
    return`<div class="kc" style="border-top:3px solid var(--nv)">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px">${name}</div>
      <div style="font-size:12px;display:flex;flex-direction:column;gap:5px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--mu)">Capital Share (1/3)</span><strong>${nisF(openCapital/3)}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--mu)">Profit Share (1/3)</span><strong class="${(period==='all'?netProfit:0)>=0?'apos':'aneg'}">${nisF((period==='all'?netProfit:0)/3)}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--mu)">Drawn</span><strong class="aneg">(${nisF(drawn)})</strong></div>
        <div style="border-top:1px solid var(--bd);padding-top:5px;display:flex;justify-content:space-between"><span style="font-weight:700">Net Equity</span><strong style="font-size:14px;color:${netEquity>=0?'var(--gn)':'var(--rd)'}">${nisF(netEquity)}</strong></div>
      </div>
    </div>`;
  }).join('');

  // ── PIPELINE ───────────────────────────────────────────────────────
  const pending=DB.batches.filter(b=>b.status==='Pending');
  const pipeCost=pending.reduce((a,b)=>a+(+b.total_cost_nis||0),0);
  const supPaid=DB.supplier_payments.reduce((a,p)=>a+(+p.amount_nis||0),0);
  document.getElementById('fin-pipe-count').textContent=pending.length;
  document.getElementById('fin-pipe-cost').textContent=nisF(pipeCost);
  document.getElementById('fin-pipe-paid').textContent=nisF(supPaid);
  document.getElementById('fin-pipe-tbl').innerHTML=pending.length?tbl(pending.map(b=>{
    const p=gP(b.product_id);const v=gV(b.variant_id);
    return{'Code':b.shipment_code,'Product':p?.name||'—','Variant':v?vLabel(v):'—',
      'Qty':b.qty_received,'Total Cost':nisF(+b.total_cost_nis||0),'Date':b.shipment_date?dF(b.shipment_date):'—'};
  }),false):'<div style="padding:14px;text-align:center;color:var(--gn);font-size:12px">✅ No pending shipments</div>';
}

// ════ FIXED ASSETS ════════════════════════════════════════════════════

function calcAssetAccDep(fa){
  if(!fa||!fa.cost||!fa.life)return 0;
  const cost=+fa.cost||0;const life=+fa.life||1;
  const annualDep=cost/life;
  const purchaseDate=new Date(fa.date+'T12:00:00');
  const now=new Date();
  const yearsElapsed=(now-purchaseDate)/(365.25*24*3600*1000);
  const yearsUsed=Math.min(Math.max(0,yearsElapsed),life);
  return Math.min(cost,annualDep*yearsUsed);
}

function calcTotalDepreciation(from,to){
  if(!DB.fixed_assets||!DB.fixed_assets.length)return 0;
  // Calculate depreciation expense for the given period
  return DB.fixed_assets.reduce((total,fa)=>{
    if(!fa.cost||!fa.life)return total;
    const cost=+fa.cost;const life=+fa.life;const annualDep=cost/life;
    if(!from)return total+calcAssetAccDep(fa);
    const start=new Date(from+'T00:00:00');
    const end=new Date(to+'T23:59:59');
    const purchase=new Date(fa.date+'T12:00:00');
    const depStart=new Date(Math.max(start,purchase));
    if(depStart>end)return total;
    const daysInPeriod=(end-depStart)/(24*3600*1000);
    const dailyDep=annualDep/365.25;
    return total+Math.min(cost,daysInPeriod*dailyDep);
  },0);
}

function renderAssets(){
  if(!DB.fixed_assets)DB.fixed_assets=[];
  const total=DB.fixed_assets.reduce((a,fa)=>a+(+fa.cost||0),0);
  const totalDep=DB.fixed_assets.reduce((a,fa)=>a+calcAssetAccDep(fa),0);
  const nbv=total-totalDep;
  const annualDep=DB.fixed_assets.reduce((a,fa)=>a+((+fa.cost||0)/(+fa.life||1)),0);

  document.getElementById('fa-total-cost').textContent=nisF(total);
  document.getElementById('fa-total-dep').textContent=nisF(totalDep);
  document.getElementById('fa-nbv').textContent=nisF(nbv);
  document.getElementById('fa-annual-dep').textContent=nisF(annualDep);

  document.getElementById('fa-tbl').innerHTML=DB.fixed_assets.length
    ? tbl(DB.fixed_assets.map(fa=>{
        const cost=+fa.cost||0;const life=+fa.life||1;
        const accDep=calcAssetAccDep(fa);
        const nbvFa=cost-accDep;
        const pct=cost>0?Math.min(100,(accDep/cost)*100):0;
        return{
          'Asset':fa.name,'Category':`<span class="b bb">${fa.cat||fa.category||'—'}</span>`,
          'Purchase Date':dF(fa.date),'Cost':nisF(cost),
          'Life':''+life+'yr','Annual Dep':nisF(cost/life),
          'Acc. Dep':nisF(accDep),'Net Book Value':`<strong style="color:${nbvFa>0?'var(--gn)':'var(--mu)'}">${nisF(nbvFa)}</strong>`,
          'Depreciated':`<span class="b ${pct>=100?'br':pct>50?'bo':'bg'}">${pct.toFixed(0)}%</span>`,
          'Notes':fa.notes||'',
          '_actions':`<button class="btn btn-s btn-sm" onclick="editAsset('${fa.id}')">✏️</button>`
        };
      }),true)
    : '<div style="padding:14px;text-align:center;color:var(--mu);font-size:12px">No fixed assets recorded yet.</div>';
}

function calcAssetDep(){
  const cost=+(document.getElementById('asset-cost').value||0);
  const life=+(document.getElementById('asset-life').value||1);
  const annual=cost/life;
  const monthly=annual/12;
  const el=document.getElementById('asset-dep-preview');
  if(el)el.value=`${nisF(annual)}/yr  (${nisF(monthly)}/month)`;
}

function openM_asset(){openM('m-asset');}

function saveAsset(){
  const name=document.getElementById('asset-name').value.trim();
  if(!name){alert('Enter asset name.');return;}
  const cost=parseFloat(document.getElementById('asset-cost').value)||0;
  if(!cost){alert('Enter purchase cost.');return;}
  const editId=document.getElementById('asset-edit-id').value;
  const row={id:editId||uid(),name,cat:document.getElementById('asset-cat').value,
    date:document.getElementById('asset-date').value,cost,
    life:+(document.getElementById('asset-life').value||5),
    notes:document.getElementById('asset-notes').value};
  if(!DB.fixed_assets)DB.fixed_assets=[];
  if(editId){
    const idx=DB.fixed_assets.findIndex(x=>x.id===editId);
    if(idx>=0)DB.fixed_assets[idx]=row;
    dbUpdate('fixed_assets', row.id, row);
  }else{
    DB.fixed_assets.push(row);
    dbInsert('fixed_assets', row);
  }
  closeM('m-asset');renderAssets();renderFinancials();
}

function editAsset(id){
  const fa=DB.fixed_assets.find(x=>x.id===id);if(!fa)return;
  document.getElementById('asset-modal-title').textContent='Edit Asset';
  document.getElementById('asset-edit-id').value=id;
  document.getElementById('asset-name').value=fa.name||'';
  document.getElementById('asset-cat').value=fa.cat||fa.category||'Equipment';
  document.getElementById('asset-date').value=fa.date||'';
  document.getElementById('asset-cost').value=fa.cost||0;
  document.getElementById('asset-life').value=fa.life||5;
  document.getElementById('asset-notes').value=fa.notes||'';
  calcAssetDep();
  openM('m-asset');
}

// ════ USER MANAGEMENT ════════════════════════════════════════════════

function renderSetupUsers(){
  const el=document.getElementById('setup-users-list');if(!el)return;
  const users=(DB.users||[]).filter(u=>u.role!=='admin');
  if(!users.length){el.innerHTML='<div style="font-size:12px;color:var(--mu);padding:8px 0">No sales persons added yet.</div>';return;}
  el.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--bg)"><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--mu);text-transform:uppercase">Username</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--mu);text-transform:uppercase">Display Name</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--mu);text-transform:uppercase">Status</th><th></th></tr></thead>
    <tbody>${users.map(u=>`<tr style="border-top:1px solid var(--bd)">
      <td style="padding:7px 10px;font-weight:600">${u.username}</td>
      <td style="padding:7px 10px">${u.display_name||'—'}</td>
      <td style="padding:7px 10px"><span class="b ${u.active!==false?'bg':'br'}">${u.active!==false?'Active':'Inactive'}</span></td>
      <td style="padding:7px 10px;white-space:nowrap">
        <button class="btn btn-s btn-sm" onclick="editUser('${u.id}')">✏️ Edit</button>
        <button class="btn btn-d btn-sm" onclick="deleteUser('${u.id}')">🗑</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function openAddUser(){
  document.getElementById('user-modal-title').textContent='Add Sales Person';
  document.getElementById('user-edit-id').value='';
  ['user-username','user-display','user-pin'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('user-active').value='true';
  openM('m-adduser');
}
function editUser(id){
  const u=(DB.users||[]).find(x=>x.id===id);if(!u)return;
  document.getElementById('user-modal-title').textContent='Edit: '+u.display_name;
  document.getElementById('user-edit-id').value=id;
  document.getElementById('user-username').value=u.username||'';
  document.getElementById('user-display').value=u.display_name||'';
  document.getElementById('user-pin').value='';
  document.getElementById('user-active').value=u.active===false?'false':'true';
  openM('m-adduser');
}



// ════ CASH HANDOVER ═══════════════════════════════════════════════════

function renderHandover(){
  const username=CURRENT_USER?.display_name||CURRENT_USER?.username||'You';
  // Show summary box only to sales persons
  if(!isAdmin()){
    const lastHandover=[...(DB.cash_handovers||[])].filter(h=>h.user_id===CURRENT_USER?.id)
      .sort((a,b)=>String(b.datetime||'').localeCompare(String(a.datetime||''))).slice(0,1)[0];
    const lastDate=lastHandover?.datetime||'';
    const cashSales=DB.sales.filter(s=>!isRet(s)&&s.payment_type==='Cash'&&isColl(s.payment_status)&&(!lastDate||String(s.date)>=lastDate.split('T')[0]));
    const codCollected=DB.sales.filter(s=>!isRet(s)&&s.payment_type==='COD'&&isColl(s.payment_status)&&(!lastDate||String(s.collection_date||s.date)>=lastDate.split('T')[0]));
    const expected=cashSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0)+codCollected.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
    const summaryEl=document.getElementById('handover-summary-box');
    if(summaryEl){
      summaryEl.innerHTML=`<strong>${username}</strong> — Cash to hand over: <strong class="apos">${nisF(expected)}</strong> (${cashSales.length} cash + ${codCollected.length} COD sales)`;
      summaryEl.style.display='block';
    }
  } else {
    // Admin: show pending count badge
    const pending=(DB.cash_handovers||[]).filter(h=>!h.confirmed).length;
    const summaryEl=document.getElementById('handover-summary-box');
    if(summaryEl){
      summaryEl.innerHTML=pending>0
        ?`<strong>⚠️ ${pending} pending handover${pending>1?'s':''} awaiting your confirmation.</strong>`
        :`<span style="color:var(--gn)">✅ All handovers confirmed.</span>`;
      summaryEl.style.display='block';
    }
  }
  // History — admin sees all, sales sees only their own
  const allHandovers=[...(DB.cash_handovers||[])].sort((a,b)=>String(b.datetime||'').localeCompare(String(a.datetime||'')));
  const history=isAdmin()?allHandovers:allHandovers.filter(h=>h.user_id===CURRENT_USER?.id);
  const el=document.getElementById('handover-tbl');
  if(!history.length){el.innerHTML='<div style="padding:14px;text-align:center;color:var(--mu);font-size:12px">No handovers recorded yet.</div>';return;}
  el.innerHTML=`<div style="overflow-x:auto"><table>
    <thead><tr><th>Date & Time</th><th>Sales Person</th><th>Amount</th><th>Expected</th><th>Diff</th><th>Notes</th><th>Status</th>${isAdmin()?'<th>Action</th>':''}</tr></thead>
    <tbody>${history.map(h=>{
      const diff=(+h.amount||0)-(+h.expected||0);
      const diffStr=diff>=0?`<span class="apos">+${nisF(diff)}</span>`:`<span class="aneg">${nisF(diff)}</span>`;
      const statusBadge=h.confirmed
        ?`<span class="b bg">✅ Confirmed${h.confirmed_by?' by '+h.confirmed_by:''}</span>`
        :`<span class="b bo">⏳ Pending</span>`;
      const actionBtn=isAdmin()&&!h.confirmed
        ?`<button class="btn btn-p btn-sm" onclick="confirmHandover('${h.id}')">Confirm</button>`
        :(isAdmin()&&h.confirmed?`<span style="font-size:11px;color:var(--mu)">${h.confirmed_at?dF(h.confirmed_at.split('T')[0]):'—'}</span>`:'');
      return`<tr>
        <td style="font-size:11px">${h.datetime?new Date(h.datetime).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</td>
        <td>${h.username||'—'}</td>
        <td style="font-weight:700">${nisF(+h.amount||0)}</td>
        <td>${nisF(+h.expected||0)}</td>
        <td>${diffStr}</td>
        <td style="font-size:11px">${h.notes||'—'}</td>
        <td>${statusBadge}</td>
        ${isAdmin()?`<td>${actionBtn}</td>`:''}
      </tr>`;
    }).join('')}
    </tbody></table></div>`;
}

async function confirmHandover(id){
  if(!confirm('Confirm receipt of this cash handover?'))return;
  const h=(DB.cash_handovers||[]).find(x=>x.id===id);if(!h)return;
  h.confirmed=true;
  h.confirmed_by=CURRENT_USER?.display_name||CURRENT_USER?.username;
  h.confirmed_at=new Date().toISOString();
  await dbUpdate('cash_handovers',id,{confirmed:true,confirmed_by:h.confirmed_by,confirmed_at:h.confirmed_at});
  renderHandover();
  alert('✅ Handover confirmed.');
}

function openHandoverModal(){
  const lastHandover=[...(DB.cash_handovers||[])].filter(h=>h.user_id===CURRENT_USER?.id).sort((a,b)=>String(b.datetime||'').localeCompare(String(a.datetime||''))).slice(0,1)[0];
  const lastDate=lastHandover?.datetime||'';
  // Cash sales + COD collections (both types the salesperson physically handles)
  const cashSales=DB.sales.filter(s=>!isRet(s)&&s.payment_type==='Cash'&&isColl(s.payment_status)&&(!lastDate||String(s.date)>=lastDate.split('T')[0]));
  const codCollected=DB.sales.filter(s=>!isRet(s)&&s.payment_type==='COD'&&isColl(s.payment_status)&&(!lastDate||String(s.collection_date||s.date)>=lastDate.split('T')[0]));
  const expected=cashSales.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0)+codCollected.reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const box=document.getElementById('handover-expected-box');
  if(box)box.innerHTML=`<div style="margin-bottom:4px;font-weight:600;color:var(--nv)">Expected cash to hand over</div><div style="font-size:20px;font-weight:700;color:var(--gn)">${nisF(expected)}</div><div style="font-size:11px;color:var(--mu);margin-top:3px">${cashSales.length} cash sales since last handover</div>`;
  document.getElementById('ho-amount').value='';
  document.getElementById('ho-notes').value='';
  document.getElementById('ho-diff').textContent='';
  document.getElementById('ho-amount').dataset.expected=expected;
  document.getElementById('m-handover')?.classList.add('open');
}
function checkHandoverDiff(){
  const amt=+(document.getElementById('ho-amount').value||0);
  const exp=+(document.getElementById('ho-amount').dataset.expected||0);
  const diff=amt-exp;
  const el=document.getElementById('ho-diff');
  if(!amt){el.textContent='';return;}
  if(Math.abs(diff)<0.01)el.innerHTML='<span class="apos">✅ Matches expected amount</span>';
  else if(diff>0)el.innerHTML=`<span class="apos">+${nisF(diff)} over expected</span>`;
  else el.innerHTML=`<span class="aneg">${nisF(diff)} short of expected</span>`;
}
function submitHandover(){
  const amt=+(document.getElementById('ho-amount').value||0);
  if(!amt){alert('Enter the amount you are handing over.');return;}
  const exp=+(document.getElementById('ho-amount').dataset.expected||0);
  const diff=amt-exp;
  const msg=diff===0?'Matches expected.':diff>0?`₪${Math.abs(diff).toFixed(2)} over expected.`:`₪${Math.abs(diff).toFixed(2)} SHORT of expected.`;
  if(!confirm(`Submit cash handover of ${nisF(amt)}?\n${msg}\n\nThis will be recorded and Admin will confirm receipt.`))return;
  const row={id:uid(),user_id:CURRENT_USER?.id,username:CURRENT_USER?.display_name||CURRENT_USER?.username,datetime:new Date().toISOString(),amount:amt,expected:exp,notes:document.getElementById('ho-notes').value,confirmed:false};
  if(!DB.cash_handovers)DB.cash_handovers=[];
  DB.cash_handovers.push(row);dbInsert('cash_handovers', row);
  closeM('m-handover');renderHandover();
  alert('✅ Handover recorded. Admin will confirm receipt.');
}

function renderSetupWCUsers(){
  const el=document.getElementById('setup-wc-users-list');if(!el)return;
  const wcs=(DB.wholesale_customers||[]).filter(c=>c.portal_username);
  if(!wcs.length){el.innerHTML='<div style="font-size:12px;color:var(--mu);padding:8px 0">No portal users yet. Add credentials to allow wholesale customers to log in.</div>';return;}
  el.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--bg)"><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--mu);text-transform:uppercase">Username</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--mu);text-transform:uppercase">Customer</th><th></th></tr></thead>
    <tbody>${wcs.map(c=>`<tr style="border-top:1px solid var(--bd)">
      <td style="padding:7px 10px;font-weight:600">${c.portal_username}</td>
      <td style="padding:7px 10px">${c.name}</td>
      <td style="padding:7px 10px;white-space:nowrap">
        <button class="btn btn-s btn-sm" onclick="editWCUser('${c.id}')">✏️ Edit</button>
        <button class="btn btn-d btn-sm" onclick="removeWCPortal('${c.id}')">🗑</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function openAddWCUser(){
  const wcs=(DB.wholesale_customers||[]);
  if(!wcs.length){alert('Add wholesale customers first (in the Wholesale module), then come here to assign portal credentials.');return;}
  document.getElementById('wcuser-modal-title').textContent='Add Portal User';
  document.getElementById('wcuser-edit-id').value='';
  const sel=document.getElementById('wcuser-cust-sel');
  sel.innerHTML='<option value="">-- Select Customer --</option>'+wcs.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  ['wcuser-username','wcuser-password'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  openM('m-wcuser');
}
function editWCUser(id){
  const c=(DB.wholesale_customers||[]).find(x=>x.id===id);if(!c)return;
  document.getElementById('wcuser-modal-title').textContent='Edit: '+c.name;
  document.getElementById('wcuser-edit-id').value=id;
  const sel=document.getElementById('wcuser-cust-sel');
  const wcs=(DB.wholesale_customers||[]);
  sel.innerHTML=wcs.map(wc=>`<option value="${wc.id}" ${wc.id===id?'selected':''}>${wc.name}</option>`).join('');
  document.getElementById('wcuser-username').value=c.portal_username||'';
  document.getElementById('wcuser-password').value='';
  openM('m-wcuser');
}
async function saveWCUser(){
  const custId=document.getElementById('wcuser-cust-sel').value;
  const uname=(document.getElementById('wcuser-username').value||'').trim().toLowerCase();
  const pwd=document.getElementById('wcuser-password').value;
  const editId=document.getElementById('wcuser-edit-id').value;
  if(!custId){alert('Select a customer.');return;}
  if(!uname){alert('Enter a username.');return;}
  if(!editId&&!pwd){alert('Enter a password for new portal user.');return;}
  if(pwd&&pwd.length<4){alert('Password must be at least 4 characters.');return;}
  const c=(DB.wholesale_customers||[]).find(x=>x.id===custId);if(!c)return;
  showLoader('Saving portal credentials…');
  try {
    // 1. Update username on the customer record
    c.portal_username=uname;
    c.portal_active=true;
    await sbFetch('/rest/v1/wholesale_customers?id=eq.'+custId, {
      method:'PATCH',
      body:JSON.stringify({portal_username:uname, portal_active:true})
    }, true);
    // 2. Hash and save password via RPC (bcrypt)
    if(pwd){
      await sbFetch('/rest/v1/rpc/update_portal_password', {
        method:'POST',
        body:JSON.stringify({p_customer_id:custId, p_password:pwd})
      }, true);
    }
    hideLoader();
    closeM('m-wcuser');renderSetupWCUsers();
    alert('✅ Portal credentials saved. Customer can now log in at the portal.');
  } catch(e) {
    hideLoader();
    alert('❌ Error saving credentials: '+e.message);
  }
}
function removeWCPortal(id){
  if(!confirm('Remove portal access for this customer?'))return;
  const c=(DB.wholesale_customers||[]).find(x=>x.id===id);if(!c)return;
  delete c.portal_username;delete c.portal_password;
  dbUpdate('wholesale_customers', c.id, c);
  renderSetupWCUsers();
}

// ════ RESERVATIONS ════════════════════════════════════════════════════

function showWhlTab(tab){
  const resSection=document.getElementById('whl-res-section');
  if(tab==='reservations'){
    if(resSection)resSection.style.display='block';
    renderReservations();
  }else{
    if(resSection)resSection.style.display='none';
  }
}
function renderReservations(){
  const pending=(DB.reservations||[]).filter(function(r){return r.status==='Pending';}).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  // Update badge
  const badge=document.getElementById('res-badge');
  if(badge){badge.textContent=pending.length;badge.style.display=pending.length?'inline':'none';}
  const el=document.getElementById('whl-res-tbl');if(!el)return;
  if(!pending.length){
    el.innerHTML='<div style="padding:14px;text-align:center;color:var(--mu);font-size:12px">No pending orders.</div>';
    return;
  }
  el.innerHTML='<div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Qty</th><th>Price</th><th>Credit Status</th><th>Action</th></tr></thead><tbody>'+
    pending.map(function(r){
      const wc=(DB.wholesale_customers||[]).find(function(c){return c.id===r.customer_id;});
      const v=gV(r.variant_id);const p=gP(r.product_id);
      const price=(+v?.wholesale||0)*(1-(+(wc?.discount_pct||0))/100);
      const orderTotal=price*(+r.qty||1);
      const outstanding=(DB.sales||[]).filter(function(s){return s.customer_id===r.customer_id&&!s.is_return&&s.payment_status!=='Collected'&&s.payment_status!=='Paid';}).reduce(function(a,s){return a+(+s.unit_price||0)*(+s.qty||1);},0);
      const creditLimit=+(wc?.credit_limit_nis||0);
      const wouldExceed=creditLimit>0&&(outstanding+orderTotal)>creditLimit;
      const creditBadge=wouldExceed
        ?'<span class="b br" title="Outstanding: '+nisF(outstanding)+' + Order: '+nisF(orderTotal)+' > Limit: '+nisF(creditLimit)+'">⚠️ Exceeds Credit</span>'
        :(creditLimit>0?'<span class="b bg">Within Limit</span>':'<span class="b bo">No Limit Set</span>');
      const notes=r.notes?('<br><span style="font-size:10px;color:var(--mu)">'+r.notes+'</span>'):'';
      return '<tr>'
        +'<td>'+dF(r.date)+'</td>'
        +'<td><strong>'+(wc?.name||r.customer_name||'—')+'</strong>'+notes+'</td>'
        +'<td>'+(p?.name||'—')+' '+(v?vLabel(v):'')+'</td>'
        +'<td>'+r.qty+'</td>'
        +'<td>'+nisF(orderTotal)+'</td>'
        +'<td>'+creditBadge+'</td>'
        +'<td style="white-space:nowrap">'
        +(wouldExceed
          ?'<span style="font-size:11px;color:var(--rd)">Cannot approve</span>'
          :('<button class="btn btn-p btn-sm" data-rid="'+r.id+'" onclick="approveReservation(this.dataset.rid)">Approve</button> '
          +'<button class="btn btn-d btn-sm" data-rid="'+r.id+'" onclick="rejectReservation(this.dataset.rid)">Reject</button>'))
        +'</td>'
        +'</tr>';
    }).join('')
    +'</tbody></table></div>';
}
async function approveReservation(id){
  const r=(DB.reservations||[]).find(x=>x.id===id);
  if(!r||r.status!=='Pending'){alert('This order is no longer pending.');renderReservations();return;}
  const wc=(DB.wholesale_customers||[]).find(c=>c.id===r.customer_id);
  const v=gV(r.variant_id);
  if(!v){alert('Product variant not found.');return;}
  // Stock check FIRST
  const avail=getStock(r.variant_id);
  if(avail<(+r.qty||1)){
    alert('Cannot approve: only '+avail+' units in stock, order requires '+(+r.qty||1)+'.');
    return;
  }
  // Credit check
  const price=(+v.wholesale||0)*(1-(+(wc?.discount_pct||0))/100);
  const orderTotal=price*(+r.qty||1);
  const outstanding=(DB.sales||[]).filter(s=>s.customer_id===r.customer_id&&!s.is_return&&s.payment_status!=='Collected'&&s.payment_status!=='Paid').reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
  const creditLimit=+(wc?.credit_limit_nis||0);
  if(creditLimit>0&&(outstanding+orderTotal)>creditLimit){
    const over=nisF(outstanding+orderTotal-creditLimit);
    alert('Cannot approve: exceeds credit limit by '+over+'. Outstanding: '+nisF(outstanding)+' | Order: '+nisF(orderTotal)+' | Limit: '+nisF(creditLimit));
    return;
  }
  if(!confirm('Approve order for '+(wc?.name||'customer')+'? Order: '+nisF(orderTotal)+' ('+r.qty+' units). A wholesale sale will be created.'))return;
  // Mark as Approved in memory and Supabase FIRST (prevents double-approval)
  r.status='Approved';
  await dbUpdate('reservations', r.id, {status:'Approved'});
  // Now deduct stock
  const fifoUnit=await fifoDeduct(r.variant_id,+r.qty||1);
  const p=gP(v.product_id);
  const activeBatch=getActiveBatches(r.variant_id)[0];
  const sale={id:uid(),date:tod(),customer_id:r.customer_id,customer_name:wc?.name||'',
    product_id:v.product_id,product_name:p?.name||'',variant_id:r.variant_id,variant_label:vLabel(v),
    batch_id:activeBatch?.id||'',qty:+r.qty||1,unit_price:price,
    unit_cost_nis:+fifoUnit.toFixed(4),discount_pct:+(wc?.discount_pct||0),payment_type:'Credit',
    payment_status:'Pending',collection_batch_id:'',collection_date:null,sale_type:'Wholesale',
    car_make:v.car_make||'',car_model:v.car_model||'',year_from:v.year_from||null,year_to:v.year_to||null,
    set_type:v.set_type||'',remark:'Order #'+id,gp_nis:+((price-fifoUnit)*(+r.qty||1)).toFixed(2),is_return:false};
  DB.sales.push(sale);
  await dbInsert('sales', sale);
  // Update reservation with sale_id
  r.sale_id=sale.id;
  await dbUpdate('reservations', r.id, {status:'Approved', sale_id:sale.id});
  renderReservations();renderSales();renderDash();
  alert('Approved. Sale created for '+nisF(orderTotal)+'.');
}
function rejectReservation(id){
  const r=(DB.reservations||[]).find(x=>x.id===id);if(!r)return;
  if(!confirm('Reject this reservation?'))return;
  r.status='Rejected';
  dbUpdate('reservations', r.id, r);
  renderReservations();
}

// nav and openM patches have been merged into the original functions above
