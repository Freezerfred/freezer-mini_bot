document.getElementById('getCode')?.addEventListener('click',()=>{
  const num=document.getElementById('number').value.trim();
  if(!num||num.length<10||!/^\d+$/.test(num)){ alert('🥶 Enter valid number: 2547XXXXXXX'); return; }
  const btn=document.getElementById('getCode'); btn.innerHTML='❄️ FREEZING...'; btn.style.opacity='.7';
  // TODO: Connect to your backend: fetch(`https://popkidxmd2026v3.onrender.com/code?number=${num}`)
  setTimeout(()=>{ btn.innerHTML='✅ CODE: XXX-XXX'; alert(`Next: Connect this to your API\nNumber: ${num}`); btn.innerHTML='⚡ GET PAIRING CODE →'; btn.style.opacity='1'; },1500);
});
