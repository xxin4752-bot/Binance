document.addEventListener('DOMContentLoaded',()=>{
  const themeKey='prefers-dark'
  const body=document.body
  const saved=localStorage.getItem(themeKey)
  if(saved==='true'){body.classList.add('dark')}
  const btn=document.getElementById('theme-toggle')
  if(btn){btn.addEventListener('click',()=>{body.classList.toggle('dark');localStorage.setItem(themeKey,body.classList.contains('dark')?'true':'false')})}
  const year=document.getElementById('year'); if(year){year.textContent=String(new Date().getFullYear())}

  const base=localStorage.getItem('apiBase')||'http://localhost:4000'
  let token=localStorage.getItem('token')||''

  function authHeaders(){return token?{Authorization:`Bearer ${token}`}:{}}

  function setLoggedIn(state){
    const authSec=document.getElementById('auth')
    const dashSec=document.getElementById('dashboard')
    if(!authSec||!dashSec) return
    if(state){authSec.style.display='none';dashSec.style.display='block'}
    else {authSec.style.display='block';dashSec.style.display='none'}
  }

  const reg=document.getElementById('register-form')
  if(reg){reg.addEventListener('submit',async(e)=>{e.preventDefault();
    const f=new FormData(reg);const email=f.get('email');const password=f.get('password');
    const r=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const j=await r.json(); if(j.token){token=j.token;localStorage.setItem('token',token);setLoggedIn(true);loadAll()}
  })}

  const login=document.getElementById('login-form')
  if(login){login.addEventListener('submit',async(e)=>{e.preventDefault();
    const f=new FormData(login);const email=f.get('email');const password=f.get('password');
    const r=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const j=await r.json(); if(j.token){token=j.token;localStorage.setItem('token',token);setLoggedIn(true);loadAll()}
  })}

  const keysForm=document.getElementById('keys-form')
  if(keysForm){keysForm.addEventListener('submit',async(e)=>{e.preventDefault();
    const f=new FormData(keysForm)
    const payload={exchange:f.get('exchange'),apiKey:f.get('apiKey'),apiSecret:f.get('apiSecret'),passphrase:f.get('passphrase')||undefined}
    const r=await fetch(base+'/api/keys/save',{method:'POST',headers:{'Content-Type':'application/json',...authHeaders()},body:JSON.stringify(payload)})
    const j=await r.json(); if(j.ok){await loadAll()}
  })}

  let chart
  async function loadHistory(){
    const r=await fetch(base+'/api/history',{headers:{...authHeaders()}})
    const j=await r.json();
    const el=document.getElementById('navChart'); if(!el) return
    const labels=[...new Set([...(j.exchanges?.binance||[]).map(i=>i.ts),...(j.exchanges?.okx||[]).map(i=>i.ts)])]
      .sort((a,b)=>a-b).map(t=>new Date(t))
    const mapSeries=(arr)=>{const m=new Map(arr.map(i=>[i.ts,i.nav_usd]));return labels.map(d=>m.get(d.getTime())||0)}
    const dataBinance=mapSeries(j.exchanges?.binance||[])
    const dataOkx=mapSeries(j.exchanges?.okx||[])
    if(chart){chart.destroy()}
    chart=new Chart(el.getContext('2d'),{type:'line',data:{labels:labels,datasets:[
      {label:'Binance NAV',data:dataBinance,borderColor:'#3b82f6',tension:.2},
      {label:'OKX NAV',data:dataOkx,borderColor:'#10b981',tension:.2}
    ]},options:{responsive:true,interaction:{mode:'index',intersect:false},scales:{x:{type:'time',time:{unit:'day'}},y:{beginAtZero:true}}}})
  }

  async function loadPositions(){
    const r=await fetch(base+'/api/positions',{headers:{...authHeaders()}})
    const j=await r.json();
    const bin=document.getElementById('positions-binance');
    const okx=document.getElementById('positions-okx');
    if(!bin||!okx) return
    bin.innerHTML=''; okx.innerHTML=''
    j.items.forEach(it=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<div>${it.asset}</div><div>${it.amount.toFixed(6)} · $${(it.value_usd||0).toFixed(2)}</div>`; (it.exchange==='binance'?bin:okx).appendChild(row)})
  }

  async function loadAll(){
    if(!token) return
    try{await loadHistory();await loadPositions()}catch{}
  }

  setLoggedIn(!!token)
  if(token){loadAll()}
})
