// ═══════════════════════════════════════════════════
// COPRA — helpers.js
// Utility functions: formatters, DB lookups, FIFO, stock
// ═══════════════════════════════════════════════════

const tod=()=>new Date().toISOString().split('T')[0];
const nisF=n=>'₪'+(+n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});
const usdF=n=>'$'+(+n||0).toFixed(2);
const pctF=n=>((+n||0)*100).toFixed(1)+'%';
const dF=d=>{if(!d)return'';try{return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}catch(e){return d}};
const isRet=s=>s.is_return===true||s.is_return==='TRUE';
const isColl=p=>{const l=(p||'').toLowerCase();return l.includes('collect')||l==='paid'||l==='cash';};
const gP=id=>DB.products.find(x=>x.id===id)||null;
const gV=id=>DB.variants.find(x=>x.id===id)||null;
const gWC=id=>DB.wholesale_customers.find(x=>x.id===id)||null;
const pN=id=>{const p=gP(id);return p?p.name:'—';};
const vLabel=v=>{if(!v)return'—';if(v.car_make&&v.car_model)return`${v.car_make} ${v.car_model} ${v.year_from?v.year_from:''}${v.year_to&&v.year_to<2099?'–'+v.year_to:v.year_to>=2099?'+':''}${v.set_type?' · '+v.set_type:''}`.trim();return v.set_type&&v.set_type!=='N/A'?v.set_type:pN(v.product_id)||'Base';};

// ═══ FIFO ENGINE (variant-level) ════════════════════════════
function getActiveBatches(variantId){
  return DB.batches.filter(b=>b.variant_id===variantId&&b.status==='Active'&&(+b.qty_remaining||0)>0)
    .sort((a,b)=>String(a.shipment_date).localeCompare(String(b.shipment_date)));
}
function getStock(variantId){
  return DB.batches.filter(b=>b.variant_id===variantId&&b.status==='Active')
    .reduce((a,b)=>a+(+b.qty_remaining||0),0);
}
function getFifoCost(variantId){
  const b=getActiveBatches(variantId)[0];return b?(+b.unit_cost_nis||0):0;
}
async function fifoDeduct(variantId,qty){
  const avail=getStock(variantId);
  if(avail<=0)return 0;
  const actualQty=Math.min(qty,avail);
  let rem=actualQty,tot=0;
  const batchUpdates=[];
  for(const b of getActiveBatches(variantId)){
    if(rem<=0)break;
    const take=Math.min(rem,+b.qty_remaining||0);
    tot+=take*(+b.unit_cost_nis||0);
    b.qty_remaining=(+b.qty_remaining||0)-take;
    if((+b.qty_remaining||0)<=0)b.status='Depleted';
    rem-=take;
    batchUpdates.push(dbUpdate('batches', b.id, {qty_remaining:b.qty_remaining, status:b.status}));
  }
  await Promise.all(batchUpdates);
  const newStock=getStock(variantId);
  const vv=gV(variantId);
  if(vv){vv.stock_qty=newStock;await dbUpdate('variants',variantId,{stock_qty:newStock});}
  return actualQty>0?tot/actualQty:0;
}
async function fifoRestore(variantId,qty){
  const b=DB.batches.filter(x=>x.variant_id===variantId&&(x.status==='Active'||x.status==='Depleted'))
    .sort((a,b)=>String(b.shipment_date).localeCompare(String(a.shipment_date)))[0];
  if(b){
    b.qty_remaining=(+b.qty_remaining||0)+qty;
    b.status='Active';
    await dbUpdate('batches', b.id, {qty_remaining:b.qty_remaining, status:'Active'});
    const newStock=getStock(variantId);
    const v=gV(variantId);
    if(v){v.stock_qty=newStock;await dbUpdate('variants',variantId,{stock_qty:newStock});}
  }
}
function recalcBatch(batchId){
  const b=DB.batches.find(x=>x.id===batchId);if(!b)return;
  const costs=DB.stock_costs.filter(c=>c.batch_id===batchId);
  b.total_cost_nis=costs.reduce((a,c)=>a+(+c.amount_nis||0),0);
  b.total_cost_usd=costs.reduce((a,c)=>a+(+c.amount_usd||0),0);
  b.unit_cost_nis=+b.qty_received>0?+(b.total_cost_nis/+b.qty_received).toFixed(4):0;
  dbUpdate('batches', b.id, b);
}

// ═══ VEHICLE LOOKUP ══════════════════════════════════════════
// Only show makes/models that exist in variants table
function getMakesForProduct(pid){
  return[...new Set(DB.variants.filter(v=>v.product_id===pid&&v.car_make).map(v=>v.car_make))].sort();
}
function getModelsForProductMake(pid,make){
  return[...new Set(DB.variants.filter(v=>v.product_id===pid&&v.car_make===make&&v.car_model).map(v=>v.car_model))].sort();
}
function getAllMakes(){
  return[...new Set(DB.variants.filter(v=>v.car_make).map(v=>v.car_make))].sort();
}
function getModelsForMake(make){
  return[...new Set(DB.variants.filter(v=>v.car_make===make&&v.car_model).map(v=>v.car_model))].sort();
}
function getCompatibleVariants(make,model,year){
  return DB.variants.filter(v=>{
    if(v.car_make!==make||v.car_model!==model)return false;
    if(year&&+year>0){if(+year<+v.year_from||+year>+v.year_to)return false;}
    return true;
  });
}

// ═══ WHOLESALE CREDIT ═══════════════════════════════════════
function getWCBal(cid){
  const s=DB.sales.filter(x=>x.customer_id===cid&&!isRet(x));
  return s.reduce((a,x)=>a+(+x.unit_price||0)*(+x.qty||1),0)-
         s.filter(x=>isColl(x.payment_status)).reduce((a,x)=>a+(+x.unit_price||0)*(+x.qty||1),0);
}
function getWCOverdue(cid){
  const wc=gWC(cid);if(!wc)return 0;
  const cut=new Date();cut.setDate(cut.getDate()-(+wc.credit_days||30));
  return DB.sales.filter(s=>s.customer_id===cid&&!isRet(s)&&!isColl(s.payment_status)&&new Date(s.date)<cut)
    .reduce((a,s)=>a+(+s.unit_price||0)*(+s.qty||1),0);
}

// ═══ SUPABASE LAYER ACTIVE (GAS removed) ══════════════════
// ═══ TABLE HELPERS ═══════════════════════════════════════════
function tbl(rows,actions=false){
  if(!rows||!rows.length)return'<div style="padding:18px;text-align:center;color:var(--mu);font-size:12px">No data</div>';
  const cols=Object.keys(rows[0]).filter(c=>!c.startsWith('_'));
  const hasA=actions&&rows[0]._actions!==undefined;
  return`<div style="overflow-x:auto"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}${hasA?'<th></th>':''}</tr></thead><tbody>${
    rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??''}</td>`).join('')}${hasA?`<td style="white-space:nowrap">${r._actions}</td>`:''}</tr>`).join('')
  }</tbody></table></div>`;
}
function pBadge(p){
  const l=(p||'').toLowerCase();
  if(l.includes('collect'))return'<span class="b bg">Collected</span>';
  if(l==='paid')return'<span class="b bg">Paid</span>';
  if(l==='cash')return'<span class="b bb">Cash</span>';
  if(l==='returned')return'<span class="b br">Returned</span>';
  if(l==='pending')return'<span class="b bo">Pending</span>';
  return`<span class="b bx">${p||'—'}</span>`;
}
function ptBadge(t){
  if(t==='Cash')return'<span class="b bb">Cash</span>';
  if(t==='COD')return'<span class="b bo">COD</span>';
  if(t==='Credit')return'<span class="b bp">Credit</span>';
  return t?`<span class="b bx">${t}</span>`:'';
}

// ═══ NAVIGATION ══════════════════════════════════════════════