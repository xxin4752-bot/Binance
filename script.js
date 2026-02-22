document.addEventListener('DOMContentLoaded',()=>{
  const key='prefers-dark'
  const body=document.body
  const saved=localStorage.getItem(key)
  if(saved==='true'){body.classList.add('dark')}
  const btn=document.getElementById('theme-toggle')
  if(btn){
    btn.addEventListener('click',()=>{
      body.classList.toggle('dark')
      localStorage.setItem(key,body.classList.contains('dark')?'true':'false')
    })
  }
  const year=document.getElementById('year')
  if(year){year.textContent=String(new Date().getFullYear())}
})

