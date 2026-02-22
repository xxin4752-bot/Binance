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

  const reg=document.getElementById('register-form')
  if(reg){reg.addEventListener('submit',async(e)=>{e.preventDefault();
    const f=new FormData(reg);const email=f.get('email');const password=f.get('password');
    const r=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const j=await r.json(); if(j.token){token=j.token;localStorage.setItem('token',token);loadAll()}
  })}

  const login=document.getElementById('login-form')
  if(login){login.addEventListener('submit',async(e)=>{e.preventDefault();
    const f=new FormData(login);const email=f.get('email');const password=f.get('password');
    const r=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const j=await r.json(); if(j.token){token=j.token;localStorage.setItem('token',token);loadAll()}
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
    const labels=j.items.map(i=>new Date(i.ts))
    const data=j.items.map(i=>i.nav_usd)
    if(chart){chart.destroy()}
    chart=new Chart(el.getContext('2d'),{type:'line',data:{labels:labels,datasets:[{label:'NAV(USD)',data:data,borderColor:'#3b82f6',tension:.2}]},options:{responsive:true,scales:{x:{type:'time',time:{unit:'day'}},y:{beginAtZero:true}}}})
  }

  async function loadPositions(){
    const r=await fetch(base+'/api/positions',{headers:{...authHeaders()}})
    const j=await r.json();
    const wrap=document.getElementById('positions'); if(!wrap) return
    wrap.className='positions'
    wrap.innerHTML=''
    j.items.forEach(it=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<div>${it.exchange.toUpperCase()} · ${it.asset}</div><div>${it.amount.toFixed(6)} · $${(it.value_usd||0).toFixed(2)}</div>`;wrap.appendChild(row)})
  }

  async function loadAll(){
    if(!token) return
    try{await loadHistory();await loadPositions()}catch{}
  }

  if(token){loadAll()}
})
