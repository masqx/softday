const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORE = "softday-prototype-v1";
const today = new Date();
today.setHours(0,0,0,0);
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmtMoney = n => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+" ₽";
const monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const weekdayFmt = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"});
let data = load();
let viewDate = new Date(today.getFullYear(),today.getMonth(),1);
let selectedDate = iso(today);
function load(){try{return JSON.parse(localStorage.getItem(STORE))||defaultData()}catch{return defaultData()}}
function defaultData(){return {tasks:[
{id:1,date:iso(today),text:"Записать планы на неделю",type:"task",done:false},
{id:2,date:iso(today),text:"Повторить материал к уроку",type:"school",done:false},
{id:3,date:iso(new Date(today.getFullYear(),today.getMonth(),Math.min(today.getDate()+2,28))),text:"Проверить график смен",type:"work",done:false}
],shifts:[],goal:{name:"Большая мечта ♡",amount:100000,saved:22000,date:"2027-05-15",savePerShift:250}}}
function persist(){localStorage.setItem(STORE,JSON.stringify(data))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function taskMarkup(t){return `<div class="task-row ${t.done?"done":""}" data-task="${t.id}"><input class="task-check" type="checkbox" ${t.done?"checked":""} aria-label="Отметить выполненным"><span class="task-text">${escapeHtml(t.text)}</span><button class="delete-task" aria-label="Удалить дело">×</button></div>`}
function renderTasks(container,items,empty){container.innerHTML=items.length?items.map(taskMarkup).join(""):`<div class="empty-state">${empty}</div>`;container.querySelectorAll(".task-row").forEach(row=>{let id=Number(row.dataset.task);row.querySelector(".task-check").addEventListener("change",e=>{let t=data.tasks.find(x=>x.id===id);if(t)t.done=e.target.checked;persist();renderAll()});row.querySelector(".delete-task").addEventListener("click",()=>{data.tasks=data.tasks.filter(x=>x.id!==id);persist();renderAll()})})}
function addTask(text,type="task",date=selectedDate){text=text.trim();if(!text)return;data.tasks.push({id:Date.now()+Math.floor(Math.random()*1000),date,text,type,done:false});persist();renderAll()}
function renderCalendar(){
 $("#monthLabel").textContent=monthNames[viewDate.getMonth()]+" "+viewDate.getFullYear();
 const first=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);
 const offset=(first.getDay()+6)%7;
 const start=new Date(first);start.setDate(first.getDate()-offset);
 const grid=$("#calendarGrid");grid.innerHTML="";
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=iso(d);const inMonth=d.getMonth()===viewDate.getMonth();const tasks=data.tasks.filter(t=>t.date===key);const cell=document.createElement("button");cell.type="button";cell.className="calendar-cell"+(!inMonth?" muted":"")+(key===selectedDate?" selected":"")+(key===iso(today)?" today":"");cell.innerHTML=`<span>${d.getDate()}</span><span class="day-dots">${tasks.some(t=>t.type==="task")?'<i class="dot dot-pink"></i>':""}${tasks.some(t=>t.type==="school")?'<i class="dot dot-lilac"></i>':""}${tasks.some(t=>t.type==="work")?'<i class="dot dot-green"></i>':""}</span>`;cell.addEventListener("click",()=>{selectedDate=key;if(!inMonth)viewDate=new Date(d.getFullYear(),d.getMonth(),1);renderAll()});grid.appendChild(cell)}
}
function renderSelectedDay(){const d=new Date(selectedDate+"T12:00:00");$("#selectedDateLabel").textContent=selectedDate===iso(today)?"Сегодня":weekdayFmt.format(d);const tasks=data.tasks.filter(t=>t.date===selectedDate);renderTasks($("#dayTasks"),tasks,"На этот день пока ничего нет. Можно выдохнуть или добавить дело ниже.")}
function renderToday(){const tasks=data.tasks.filter(t=>t.date===iso(today));renderTasks($("#allTasks"),tasks,"На сегодня пока нет дел. Хороший момент добавить что-нибудь важное.");$("#taskCount").textContent=`${tasks.length} ${tasks.length===1?"дело":tasks.length<5?"дела":"дел"}`}
function renderSchool(){renderTasks($("#schoolTasks"),data.tasks.filter(t=>t.type==="school"),"Здесь появятся твои задания по предметам.")}
function renderWork(){const month=String(today.getMonth()+1).padStart(2,"0"),year=today.getFullYear();const shifts=data.shifts.filter(s=>s.date.startsWith(`${year}-${month}`));$("#shiftCount").textContent=shifts.length;$("#hoursCount").textContent=shifts.reduce((n,s)=>n+Number(s.hours),0);$("#incomeCount").textContent=fmtMoney(shifts.reduce((n,s)=>n+Number(s.pay),0));$("#shiftList").innerHTML=data.shifts.length?data.shifts.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(s=>`<div class="shift-row"><span>◷</span><span>${new Date(s.date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"})} · ${s.hours} ч</span><strong>${fmtMoney(s.pay)}</strong><button data-shift="${s.id}" aria-label="Удалить смену">×</button></div>`).join(""):`<div class="empty-state">Пока смен нет — добавь первую выше.</div>`;$$("[data-shift]").forEach(b=>b.addEventListener("click",()=>{data.shifts=data.shifts.filter(s=>s.id!==Number(b.dataset.shift));persist();renderWork();renderSavings()}))}
function calculateSavings(){const g=data.goal;const amount=Math.max(1,Number(g.amount)||1),saved=Math.max(0,Number(g.saved)||0),left=Math.max(0,amount-saved);const pct=Math.min(100,Math.round(saved/amount*100));$("#goalTitle").textContent=g.name||"Моя цель ♡";$("#savedBig").textContent=fmtMoney(saved);$("#goalBig").textContent=fmtMoney(amount);$("#progressFill").style.width=pct+"%";$("#progressText").textContent=pct+"% накоплено";$("#leftText").textContent=left===0?"Цель достигнута ♡":"Осталось "+fmtMoney(left);$("#goalName").value=g.name;$("#goalAmount").value=g.amount;$("#savedAmount").value=g.saved;$("#goalDate").value=g.date;$("#savePerShift").value=g.savePerShift;let weeks=1;if(g.date){const days=Math.ceil((new Date(g.date+"T23:59:59")-today)/86400000);weeks=Math.max(1,Math.ceil(days/7))}const weekly=left===0?0:Math.ceil(left/weeks);$("#weeklySave").textContent=fmtMoney(weekly);const perShift=Math.max(0,Number(g.savePerShift)||0);$("#weeklyShifts").textContent=left===0?"0":perShift>0?String(Math.ceil(weekly/perShift))+" смен":"укажи сумму";$("#goalDate").min=iso(today)}
function renderAll(){renderCalendar();renderSelectedDay();renderToday();renderSchool();renderWork();calculateSavings();$("#topDate").textContent=new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",weekday:"short"}).format(today)}
function switchPage(name){$$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+name));$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));closeMenu();window.scrollTo({top:0,behavior:"smooth"})}
function closeMenu(){$("#sidebar").classList.remove("open");$("#scrim").classList.remove("show")}
$$(".nav-item").forEach(b=>b.addEventListener("click",()=>switchPage(b.dataset.page)));
$$("[data-goto]").forEach(b=>b.addEventListener("click",()=>switchPage(b.dataset.goto)));
$("#menuToggle").addEventListener("click",()=>{$("#sidebar").classList.toggle("open");$("#scrim").classList.toggle("show")});
$("#scrim").addEventListener("click",closeMenu);
$("#prevMonth").addEventListener("click",()=>{viewDate.setMonth(viewDate.getMonth()-1);renderCalendar()});
$("#nextMonth").addEventListener("click",()=>{viewDate.setMonth(viewDate.getMonth()+1);renderCalendar()});
let touchX=0;$("#calendarGrid").addEventListener("touchstart",e=>{touchX=e.changedTouches[0].screenX},{passive:true});$("#calendarGrid").addEventListener("touchend",e=>{const dx=e.changedTouches[0].screenX-touchX;if(Math.abs(dx)>65){viewDate.setMonth(viewDate.getMonth()+(dx<0?1:-1));renderCalendar()}},{passive:true});
$("#taskForm").addEventListener("submit",e=>{e.preventDefault();addTask($("#taskInput").value);$("#taskInput").value=""});
$("#todayForm").addEventListener("submit",e=>{e.preventDefault();addTask($("#todayInput").value);$("#todayInput").value=""});
$("#schoolForm").addEventListener("submit",e=>{e.preventDefault();addTask($("#schoolInput").value,"school",iso(today));$("#schoolInput").value=""});
$("#shiftDate").value=iso(today);
$("#shiftForm").addEventListener("submit",e=>{e.preventDefault();data.shifts.push({id:Date.now(),date:$("#shiftDate").value,hours:Number($("#shiftHours").value),pay:Number($("#shiftPay").value)});persist();renderWork();renderSavings();e.target.reset();$("#shiftDate").value=iso(today);$("#shiftHours").value=5;$("#shiftPay").value=345});
$("#saveSettings").addEventListener("click",()=>{data.goal={name:$("#goalName").value.trim()||"Моя цель ♡",amount:Math.max(1,Number($("#goalAmount").value)||1),saved:Math.max(0,Number($("#savedAmount").value)||0),date:$("#goalDate").value||iso(new Date(today.getFullYear(),today.getMonth()+6,today.getDate())),savePerShift:Math.max(0,Number($("#savePerShift").value)||0)};persist();calculateSavings();$("#saveSettings").textContent="План обновлён ✓";setTimeout(()=>$("#saveSettings").textContent="Пересчитать план",1500)});
$("#depositForm").addEventListener("submit",e=>{e.preventDefault();const n=Number($("#depositInput").value);if(n>0){data.goal.saved=Number(data.goal.saved||0)+n;$("#savedAmount").value=data.goal.saved;persist();calculateSavings();$("#depositInput").value=""}});
/* Swipe from the screen edge opens the menu on touch devices. */
let edgeStart=null;document.addEventListener("touchstart",e=>{if(e.touches[0].clientX<22)edgeStart=e.touches[0].clientX},{passive:true});document.addEventListener("touchend",e=>{if(edgeStart!==null&&e.changedTouches[0].clientX-edgeStart>55){$("#sidebar").classList.add("open");$("#scrim").classList.add("show")}edgeStart=null},{passive:true});
/* Horizontal calendar swipes work across the calendar panel, not only a date cell. */
let calStart=null;$(".calendar-panel").addEventListener("touchstart",e=>{calStart={x:e.changedTouches[0].screenX,y:e.changedTouches[0].screenY}},{passive:true});$(".calendar-panel").addEventListener("touchend",e=>{if(!calStart)return;const dx=e.changedTouches[0].screenX-calStart.x,dy=e.changedTouches[0].screenY-calStart.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.25){viewDate.setMonth(viewDate.getMonth()+(dx<0?1:-1));renderCalendar()}calStart=null},{passive:true});
renderAll();
