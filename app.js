(()=>{'use strict';
const R=window.RULES,SETS=window.SETS,$=s=>document.querySelector(s);
const K='ck2_',ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(K+k));return v==null?d:v}catch(e){return d}},sv=(k,v)=>{try{localStorage.setItem(K+k,JSON.stringify(v))}catch(e){}};
const D={att:ld('att',[]),days:ld('days',{}),notes:ld('notes',[]),plan:ld('plan',{})},save=k=>sv(k,D[k]);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const p2=n=>String(n).padStart(2,'0'),dk=d=>{d=d||new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const pct=(a,b)=>b?Math.round(a*100/b):0,fmt=s=>p2(Math.floor(s/60))+':'+p2(s%60);
const shuf=a=>a.map(x=>[Math.random(),x]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='show';clearTimeout(toast.h);toast.h=setTimeout(()=>t.className='',2200)};
let tab='home',run=null,last=null,cache={},nq='';
document.body.insertAdjacentHTML('afterbegin','<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="gr"><stop offset="0" stop-color="#7c6bff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg>');

/* ---------- data helpers ---------- */
const load=id=>cache[id]?Promise.resolve(cache[id]):new Promise((ok,no)=>{const s=SETS.find(x=>x.id===id),e=document.createElement('script');e.src=s.file;e.onload=()=>{const p=(window.PAPERS||{})[id];p?ok(cache[id]=p.questions.map((q,i)=>Object.assign({},q,{set:id,i}))):no()};e.onerror=no;document.head.appendChild(e)});
const agg=()=>{const g={};D.att.forEach(a=>{for(const t in a.tp){g[t]=g[t]||{c:0,t:0};g[t].c+=a.tp[t].c;g[t].t+=a.tp[t].t}});return g};
const weak=()=>{const g=agg();return R.topics.map(t=>[t,g[t]&&g[t].t?pct(g[t].c,g[t].t):50]).sort((a,b)=>a[1]-b[1])};
const today=()=>(D.days[dk()]||{q:0}).q;
const streak=()=>{let n=0,d=new Date();if(!today())d.setDate(d.getDate()-1);while((D.days[dk(d)]||{q:0}).q>0){n++;d.setDate(d.getDate()-1)}return n};
const left=()=>D.plan.date?Math.ceil((new Date(D.plan.date+'T00:00')-new Date(dk()+'T00:00'))/864e5):null;
const phase=()=>{const l=left();return l===null||l<0?null:l>60?['Build',1]:l>15?['Practice',1.2]:['Revise',.8]};
const target=()=>{const p=phase();return p?Math.round(R.dailyGoal*p[1]):R.dailyGoal};
const ring=(p,txt)=>`<div class="ring"><svg viewBox="0 0 120 120"><circle class="t" cx="60" cy="60" r="52"/><circle class="f" cx="60" cy="60" r="52" style="--o:${Math.round(327*(1-Math.min(1,p)))}"/></svg><b>${txt}</b></div>`;
const bars=g=>R.topics.filter(t=>g[t]&&g[t].t).map(t=>{const p=pct(g[t].c,g[t].t);return `<div class="br"><span>${esc(t.split(' ')[0]+(t.split(' ')[1]?' '+t.split(' ')[1]:''))}</span><div class="bar"><i style="width:${p}%"></i></div><span>${p}%</span></div>`}).join('')||'<p class="mu">Take a test to see topic accuracy.</p>';

/* ---------- views ---------- */
const nav=[['home','🏠','Home'],['drill','⚡','Drill'],['plan','🎯','Plan'],['notes','📝','Notes'],['stats','📊','Stats']];
function dock(){$('#dock').innerHTML=nav.map(n=>`<button class="${tab===n[0]?'on':''}" data-a="tab" data-v="${n[0]}"><span>${n[1]}</span>${n[2]}</button>`).join('')}
function show(h){$('#app').innerHTML='<section class="v">'+h+'</section>';window.scrollTo(0,0)}
function view(){document.body.classList.remove('inrun');dock();({home,drill,plan,notes,stats})[tab]()}
function home(){const g=target(),l=left(),b=agg();
 show(`<div class="card hero">${ring(today()/g,today())}<div><h1>Today</h1><p class="mu" style="margin:0">${today()} of ${g} questions · 🔥 ${streak()} day streak${l!==null&&l>=0?' · '+l+' days to exam':''}</p></div></div>
 <div class="card drill"><h3>⚡ Wise Drill</h3><p>10 minutes. 15 questions picked from your weakest topics.</p><button class="btn" data-a="drill">Start drill</button></div>
 <h3 style="margin:16px 4px 8px">Question sets</h3>${SETS.map(s=>{const bs=D.att.filter(a=>a.label===s.name&&a.kind==='test').reduce((m,a)=>Math.max(m,pct(a.c,a.n)),0);return `<div class="card set"><div><b>${esc(s.name)}</b><br><small>${bs?'Best test accuracy '+bs+'%':'Not attempted yet'}</small></div><div style="display:flex;gap:8px"><button class="btn s" data-a="test" data-v="${s.id}">Timed test</button><button class="btn s g" data-a="quiz" data-v="${s.id}">Quiz</button></div></div>`}).join('')}`)}
function drill(){const done=(D.days[dk()]||{}).drill;
 show(`<div class="card drill"><h1>⚡ Wise Drill</h1><p>One short sitting a day: 10 minutes, 15 questions from your weakest topics, instant answers.</p><p>${done?'✅ Done today — go again to improve more.':'Not done today yet.'}</p><button class="btn" data-a="drill">${done?'Drill again':'Start today\'s drill'}</button></div>
 <div class="card"><h3>Your weakest topics</h3>${weak().slice(0,4).map(w=>`<div class="br"><span>${esc(w[0])}</span><div class="bar"><i style="width:${w[1]}%"></i></div><span>${w[1]}%</span></div>`).join('')}</div>`)}
function plan(){const p=D.plan,l=left(),ph=phase(),w=weak().map(x=>x[0]);
 let body='<p class="mu">Set your exam date to get a daily target and a weekly plan.</p>';
 if(ph){const wk=Object.keys(D.days).filter(k=>(Date.now()-new Date(k+'T00:00'))/864e5<7).reduce((n,k)=>n+D.days[k].q,0);
 body=`<div class="hero">${ring(Math.max(0,1-l/180),l)}<div><h3>${l} days to go</h3><p class="mu" style="margin:0">Phase: <b>${ph[0]}</b> · target <b>${target()}</b> questions a day</p></div></div>
 <p>This week: ${wk} / ${target()*7}</p><div class="bar"><i style="width:${Math.min(100,pct(wk,target()*7))}%"></i></div>
 <h3 style="margin-top:16px">Weekly rhythm</h3>${['Mon','Tue','Wed','Thu','Fri'].map((d,i)=>`<div class="day"><b>${d}</b><span>${esc(w[i])} · ${target()} Q</span></div>`).join('')}<div class="day"><b>Sat</b><span>Full timed test</span></div><div class="day"><b>Sun</b><span>Revise notes + Wise Drill</span></div>`}
 else if(l!==null&&l<0)body='<p class="mu">That exam date has passed — set a new one below.</p>';
 show(`<div class="card"><h1>🎯 Exam plan</h1>${body}</div><div class="card"><h3>Exam details</h3><input id="pn" placeholder="Exam name" value="${esc(p.name||R.name)}"><input id="pd" type="date" value="${p.date||''}"><div class="row"><button class="btn" data-a="saveplan">Save plan</button></div></div>`)}
function noteList(){const q=nq.toLowerCase(),L=D.notes.filter(n=>!q||(n.x+n.t).toLowerCase().includes(q)).sort((a,b)=>b.pin-a.pin||b.id-a.id);
 return L.map(n=>`<div class="card note"><span class="tag">${esc(n.t)}</span> <small>${n.d}</small><p>${esc(n.x)}</p><button class="btn s g" data-a="pin" data-v="${n.id}">${n.pin?'📌 Pinned':'Pin'}</button> <button class="btn s g" data-a="del" data-v="${n.id}">Delete</button></div>`).join('')||'<p class="mu" style="text-align:center">No notes yet. Save mistakes from your results, or write one above.</p>'}
function notes(){show(`<div class="card"><h1>📝 Smart notes</h1><p class="mu" style="margin:0">Mistakes you save from results land here, tagged by topic.</p><select id="nt">${R.topics.map(t=>`<option>${esc(t)}</option>`).join('')}</select><textarea id="nx" rows="3" placeholder="Write a quick note…"></textarea><div class="row"><button class="btn" data-a="addnote">Save note</button></div></div><input id="ns" placeholder="🔍 Search notes" value="${esc(nq)}"><div id="nl" style="margin-top:12px">${noteList()}</div>`)}
function heat(){const t=new Date(),s=new Date(t);s.setDate(s.getDate()-(16*7+t.getDay()));let h='',i=0;for(const d=new Date(s);d<=t;d.setDate(d.getDate()+1),i++){const q=(D.days[dk(d)]||{q:0}).q,l=q>=50?4:q>=30?3:q>=10?2:q>0?1:0;h+=`<i class="${l?'l'+l:''}" style="--d:${i*8}ms" title="${dk(d)}: ${q} Q"></i>`}return `<div class="hm">${h}</div><p class="mu" style="margin:8px 0 0;font-size:12px">Last 17 weeks · darker = more questions</p>`}
function trend(){const A=D.att.slice(-10);if(A.length<2)return '<p class="mu">Complete two tests to see your trend.</p>';const pts=A.map((a,i)=>[10+i*280/(A.length-1),80-pct(a.c,a.n)*.7]);return `<svg class="trend" viewBox="0 0 300 90"><path pathLength="1" d="M${pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L')}"/></svg>`}
function stats(){const A=D.att,c=A.reduce((n,a)=>n+a.c,0),t=A.reduce((n,a)=>n+a.c+a.w,0),qs=Object.values(D.days).reduce((n,d)=>n+d.q,0);
 show(`<div class="tiles"><div class="card tile"><b>${A.length}</b><small>tests & drills</small></div><div class="card tile"><b>${pct(c,t)}%</b><small>accuracy</small></div><div class="card tile"><b>${qs}</b><small>questions solved</small></div><div class="card tile"><b>🔥 ${streak()}</b><small>day streak</small></div></div>
 <div class="card"><h3>Accuracy trend</h3>${trend()}</div><div class="card"><h3>Topic accuracy</h3>${bars(agg())}</div><div class="card"><h3>Activity heatmap</h3>${heat()}</div><button class="btn" style="width:100%" data-a="pdf">📄 Export PDF report</button>`)}

/* ---------- test / quiz / drill ---------- */
async function start(kind,id){let qs,label,secs=0;
 try{if(kind==='drill'){const all=(await Promise.all(SETS.map(s=>load(s.id).catch(()=>[])))).flat();if(!all.length)return toast('No questions found');const w=Object.fromEntries(weak());qs=shuf(all).sort((a,b)=>(w[a.s]==null?50:w[a.s])-(w[b.s]==null?50:w[b.s])).slice(0,15);label='Wise Drill';secs=600}
 else{qs=await load(id);label=SETS.find(s=>s.id===id).name;if(kind==='test')secs=Math.ceil(qs.length*R.minutes*60/100);else qs=shuf(qs)}}
 catch(e){return toast('Could not load that set — check data/manifest.js')}
 run={kind,qs,label,ans:qs.map(()=>null),cur:0,left:secs,timed:secs>0,t0:Date.now()};
 clearInterval(run.h);run.h=setInterval(()=>{if(!run.timed)return;run.left--;const e=$('#tm');if(e)e.textContent=fmt(run.left);if(run.left<=0){toast('Time is up');submit()}},1000);qv()}
function qv(){const r=run,q=r.qs[r.cur],a=r.ans[r.cur],lock=r.kind!=='test'&&a!==null;document.body.classList.add('inrun');
 $('#app').innerHTML=`<section class="v"><div class="rtop"><button class="btn s g" data-a="exit">✕ Exit</button><span>${esc(r.label)}</span>${r.timed?`<b id="tm" class="tm">${fmt(r.left)}</b>`:'<span></span>'}</div><div class="bar"><i style="width:${pct(r.cur+1,r.qs.length)}%"></i></div><div class="chips">${r.qs.map((_,i)=>`<b class="chip${i===r.cur?' on':r.ans[i]!==null?' dn':''}" data-a="go" data-v="${i}">${i+1}</b>`).join('')}</div>
 <div class="card"><small>${esc(q.s)}${q.c?' · '+esc(q.c):''}</small><h2>${r.cur+1}. ${esc(q.q)}</h2>${q.o.map((t,i)=>`<button class="opt${a===i?' sel':''}${lock&&i===q.a?' ok':''}${lock&&a===i&&i!==q.a?' bad':''}" data-a="pick" data-v="${i}"><i>${'ABCD'[i]}</i>${esc(t)}</button>`).join('')}${lock&&q.e?`<p class="ex">💡 ${esc(q.e)}</p>`:''}</div>
 <div class="row"><button class="btn g" data-a="prev">←</button><button class="btn g" data-a="clr">Clear</button><button class="btn" data-a="${r.cur<r.qs.length-1?'next':'sub'}">${r.cur<r.qs.length-1?'Next →':'Submit ✓'}</button></div></section>`;
 const c=$('.chip.on');if(c)c.scrollIntoView({inline:'center',block:'nearest'})}
function submit(){clearInterval(run.h);const r=run;let c=0,w=0;const tp={};
 r.qs.forEach((q,i)=>{const a=r.ans[i];tp[q.s]=tp[q.s]||{c:0,t:0};if(a===null)return;tp[q.s].t++;if(a===q.a){c++;tp[q.s].c++}else w++});
 const n=r.qs.length,a={id:Date.now(),d:dk(),label:r.label,kind:r.kind,n,c,w,sc:Math.round((c-w*R.neg)*100)/100,tp,sec:Math.round((Date.now()-r.t0)/1000)};
 D.att.push(a);save('att');const dd=D.days[a.d]=D.days[a.d]||{q:0};dd.q+=c+w;if(r.kind==='drill')dd.drill=1;save('days');last=r;run=null;result(a)}
function result(a){document.body.classList.remove('inrun');dock();const bad=last.qs.map((q,i)=>[q,i]).filter(x=>last.ans[x[1]]!==null&&last.ans[x[1]]!==x[0].a);
 show(`<div class="card hero">${ring(a.c/a.n,pct(a.c,a.n)+'%')}<div><h1>${a.sc} marks</h1><p class="mu" style="margin:0">${a.c} right · ${a.w} wrong · ${a.n-a.c-a.w} skipped · ${fmt(a.sec)}</p></div></div><div class="card"><h3>By topic</h3>${bars(a.tp)}</div>
 <h3 style="margin:14px 4px 8px">Review mistakes (${bad.length})</h3>${bad.map(x=>`<div class="card"><small>${esc(x[0].s)}</small><p><b>${esc(x[0].q)}</b></p><p style="color:var(--no);margin:2px 0">Your answer: ${esc(x[0].o[last.ans[x[1]]])}</p><p style="color:var(--ok);margin:2px 0">Correct: ${esc(x[0].o[x[0].a])}</p>${x[0].e?`<p class="mu">💡 ${esc(x[0].e)}</p>`:''}<button class="btn s g" data-a="savenote" data-v="${x[1]}">📝 Save to notes</button></div>`).join('')||'<p class="mu">No mistakes — brilliant!</p>'}
 <div class="row"><button class="btn" data-a="tab" data-v="home">Home</button><button class="btn g" data-a="tab" data-v="stats">Stats</button></div>`)}

/* ---------- PDF report (uses the phone's Print → Save as PDF) ---------- */
function pdf(){const g=agg(),A=D.att.slice(-10).reverse(),c=D.att.reduce((n,a)=>n+a.c,0),t=D.att.reduce((n,a)=>n+a.c+a.w,0);
 $('#rep').innerHTML=`<h1>${esc(D.plan.name||R.name)} · Performance report</h1><p>${new Date().toDateString()} · ${D.att.length} attempts · accuracy ${pct(c,t)}% · streak ${streak()} days${left()!==null&&left()>=0?' · '+left()+' days to exam':''}</p>
 <h3>Topic accuracy</h3><table><tr><th>Topic</th><th>Correct</th><th>Attempted</th><th>Accuracy</th></tr>${R.topics.filter(x=>g[x]).map(x=>`<tr><td>${esc(x)}</td><td>${g[x].c}</td><td>${g[x].t}</td><td>${pct(g[x].c,g[x].t)}%</td></tr>`).join('')}</table>
 <h3>Last attempts</h3><table><tr><th>Date</th><th>Set</th><th>Type</th><th>Score</th><th>Accuracy</th></tr>${A.map(a=>`<tr><td>${a.d}</td><td>${esc(a.label)}</td><td>${a.kind}</td><td>${a.sc}</td><td>${pct(a.c,a.c+a.w)}%</td></tr>`).join('')}</table>
 <h3>Weakest topics</h3><p>${weak().slice(0,4).map(w=>esc(w[0])+' ('+w[1]+'%)').join(', ')}</p>`;
 toast('Choose "Save as PDF" in the print window');setTimeout(()=>window.print(),500)}

/* ---------- rough pad + calculator ---------- */
const P={st:[],cur:null,er:0,ex:''};
function redraw(){const cv=$('#cv'),x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);const ink=getComputedStyle(document.documentElement).getPropertyValue('--tx').trim()||'#fff';P.st.forEach(s=>{x.globalCompositeOperation=s.e?'destination-out':'source-over';x.strokeStyle=ink;x.lineWidth=s.e?22:3;x.lineCap=x.lineJoin='round';x.beginPath();s.p.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke()})}
function pad(){const p=$('#pad');p.className='pad show';p.innerHTML=`<div class="pt"><button data-a="pen" class="${P.er?'':'on'}">✏️</button><button data-a="era" class="${P.er?'on':''}">🧽</button><button data-a="und">↩️</button><button data-a="pclr">🗑️</button><button data-a="calc">🧮</button><button data-a="pclose">✕</button></div><canvas id="cv"></canvas><div class="calc" id="cl"><div id="cd">0</div>${'7 8 9 ÷ 4 5 6 × 1 2 3 − 0 . = +'.split(' ').map(k=>`<button data-a="ck" data-v="${k}">${k}</button>`).join('')}<button data-a="ck" data-v="C">C</button></div>`;
 const cv=$('#cv');cv.width=cv.clientWidth;cv.height=cv.clientHeight;redraw();const pt=e=>{const b=cv.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top]};
 cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);P.cur={e:P.er,p:[pt(e)]};P.st.push(P.cur);redraw()};cv.onpointermove=e=>{if(P.cur){P.cur.p.push(pt(e));redraw()}};cv.onpointerup=()=>{P.cur=null}}
function calc(k){if(k==='C')P.ex='';else if(k==='='){try{const s=P.ex.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');if(/^[0-9+\-*/. ]+$/.test(s))P.ex=String(Math.round(Function('return '+s)()*1e8)/1e8)}catch(e){P.ex='Error'}}else P.ex=(P.ex==='Error'?'':P.ex)+k;$('#cd').textContent=P.ex||'0'}

/* ---------- events ---------- */
const act={
 tab:v=>{if(run)return;tab=v;view()},theme:()=>{const r=document.documentElement,t=r.dataset.t==='dark'?'light':'dark';r.dataset.t=t;sv('t',t);$('meta[name=theme-color]').content=t==='dark'?'#070a1a':'#f3f1fb'},
 test:v=>start('test',v),quiz:v=>start('quiz',v),drill:()=>start('drill'),
 pick:v=>{const r=run,i=+v;if(r.kind==='test')r.ans[r.cur]=r.ans[r.cur]===i?null:i;else if(r.ans[r.cur]===null)r.ans[r.cur]=i;qv()},
 go:v=>{run.cur=+v;qv()},next:()=>{run.cur++;qv()},prev:()=>{if(run.cur>0){run.cur--;qv()}},clr:()=>{if(run.kind==='test'){run.ans[run.cur]=null;qv()}},
 sub:()=>{const n=run.ans.filter(x=>x===null).length;if(!n||confirm(n+' unanswered. Submit now?'))submit()},
 exit:()=>{if(confirm('Leave without saving this attempt?')){clearInterval(run.h);run=null;view()}},
 savenote:v=>{const q=last.qs[+v];D.notes.push({id:Date.now(),t:q.s,d:dk(),pin:0,x:q.q+'\nAnswer: '+q.o[q.a]+(q.e?'\n'+q.e:'')});save('notes');toast('Saved to notes')},
 addnote:()=>{const x=$('#nx').value.trim();if(!x)return toast('Write something first');D.notes.push({id:Date.now(),t:$('#nt').value,d:dk(),pin:0,x});save('notes');notes()},
 pin:v=>{const n=D.notes.find(x=>x.id==v);n.pin=n.pin?0:1;save('notes');$('#nl').innerHTML=noteList()},
 del:v=>{D.notes=D.notes.filter(x=>x.id!=v);save('notes');$('#nl').innerHTML=noteList()},
 saveplan:()=>{D.plan={name:$('#pn').value.trim(),date:$('#pd').value};save('plan');toast('Plan saved');plan()},
 pdf,pad,pclose:()=>{$('#pad').className='pad'},pen:()=>{P.er=0;pad()},era:()=>{P.er=1;pad()},und:()=>{P.st.pop();redraw()},pclr:()=>{P.st=[];redraw()},calc:()=>$('#cl').classList.toggle('show'),ck:calc};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&act[b.dataset.a])act[b.dataset.a](b.dataset.v)});
document.addEventListener('input',e=>{if(e.target.id==='ns'){nq=e.target.value;$('#nl').innerHTML=noteList()}});
view();
})();
