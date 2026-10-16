const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORE = "softday-prototype-v1";
const today = new Date(); today.setHours(0,0,0,0);
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmtMoney = n => new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+" ₽";
const monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const weekdayFmt = new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"});
let data = load();
let viewDate = new Date(today.getFullYear(),today.getMonth(),1);
let selectedDate = iso(today);
function defaultData(){return {tasks:[
{id:1,date:iso(today),text:"Записать планы на неделю",type:"task",done:false},
{id:2,date:iso(today),text:"Повторить материал к уроку",type:"school",done:false},
{id:3,date:iso(new Date(today.getFullYear(),today.getMonth(),Math.min(today.getDate()+2,28))),text:"Проверить график смен",type:"work",done:false}
],shifts:[],shiftTypes:[],goal:{name:"Большая мечта ♡",amount:100000,saved:22000,date:"2027-05-15",savePerShift:250}}}
function load(){try{const d=JSON.parse(localStorage.getItem(STORE))||defaultData();d.shiftTypes ||= [];d.shifts ||= [];return d}catch{return defaultData()}}
function persist(){localStorage.setItem(STORE,JSON.stringify(data))}
function formatTime12(value){if(!value||!/^\d{2}:\d{2}$/.test(value))return "";const [hh,mm]=value.split(":").map(Number);const suffix=hh>=12?"PM":"AM";return `${hh%12||12}:${String(mm).padStart(2,"0")} ${suffix}`}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function taskMarkup(t){return `<div class="task-row ${t.done?"done":""}" data-task="${t.id}"><input class="task-check" type="checkbox" ${t.done?"checked":""} aria-label="Отметить выполненным"><span class="task-text">${escapeHtml(t.text)}${t.time?`<small class="task-time">${formatTime12(t.time)}</small>`:""}</span><button class="delete-task" aria-label="Удалить дело">×</button></div>`}
function renderTasks(container,items,empty){container.innerHTML=items.length?items.map(taskMarkup).join(""):`<div class="empty-state">${empty}</div>`;container.querySelectorAll(".task-row").forEach(row=>{let id=Number(row.dataset.task);row.querySelector(".task-check").addEventListener("change",e=>{let t=data.tasks.find(x=>x.id===id);if(t)t.done=e.target.checked;persist();renderAll()});row.querySelector(".delete-task").addEventListener("click",()=>{data.tasks=data.tasks.filter(x=>x.id!==id);persist();renderAll()})})}
function addTask(text,type="task",date=selectedDate,time=""){text=text.trim();if(!text)return;data.tasks.push({id:Date.now()+Math.floor(Math.random()*1000),date,text,type,done:false,...(time?{time}: {})});persist();renderAll()}
function renderCalendar(){
 $("#monthLabel").textContent=monthNames[viewDate.getMonth()]+" "+viewDate.getFullYear();
 const first=new Date(viewDate.getFullYear(),viewDate.getMonth(),1),offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(first.getDate()-offset);
 const grid=$("#calendarGrid");grid.innerHTML="";
 for(let i=0;i<42;i++){
  const d=new Date(start);d.setDate(start.getDate()+i);const key=iso(d),inMonth=d.getMonth()===viewDate.getMonth();
  const items=[
   ...data.tasks.filter(t=>t.date===key&&t.type!=="school"&&t.time).map(t=>({title:t.text,time:t.time,kind:"event"})),
   ...data.shifts.filter(s=>s.date===key&&s.startTime).map(s=>({title:s.name||"Смена",time:s.startTime,kind:"shift"}))
  ].sort((a,b)=>a.time.localeCompare(b.time));
  const visible=items.slice(0,2);const cell=document.createElement("button");cell.type="button";cell.className="calendar-cell"+(!inMonth?" muted":"")+(key===selectedDate?" selected":"")+(key===iso(today)?" today":"");
  const chips=visible.map(item=>`<span class="calendar-chip ${item.kind}"><span class="calendar-chip-title">${escapeHtml(item.title)}</span><span class="calendar-chip-time">${formatTime12(item.time)}</span></span>`).join("");
  const more=items.length>2?`<span class="calendar-more">+${items.length-2} ещё</span>`:"";
  cell.innerHTML=`<span class="calendar-day-number">${d.getDate()}</span><span class="calendar-items">${chips}${more}</span>`;
  cell.addEventListener("click",()=>{selectedDate=key;if(!inMonth)viewDate=new Date(d.getFullYear(),d.getMonth(),1);renderAll()});grid.appendChild(cell)
 }
}
function renderSelectedDay(){
 const d=new Date(selectedDate+"T12:00:00");$("#selectedDateLabel").textContent=selectedDate===iso(today)?"Сегодня":weekdayFmt.format(d);
 const tasks=data.tasks.filter(t=>t.date===selectedDate);renderTasks($("#dayTasks"),tasks,"На этот день пока ничего нет.");
 const form=$("#calendarShiftForm");form.hidden=true;
 const show=$("#showCalendarShiftForm");show.textContent="＋ Добавить смену";
 renderCalendarShiftOptions();
 const shifts=data.shifts.filter(s=>s.date===selectedDate);
 if(shifts.length){const wrap=document.createElement("div");wrap.className="day-shifts";wrap.innerHTML=shifts.map(s=>`<div class="day-shift-row"><span class="dot dot-green"></span><span><strong>${escapeHtml(s.name||"Смена")}</strong><small>${s.startTime?formatTime12(s.startTime)+" · ":""}${s.hours} ч · ${fmtMoney(s.rate ?? (Number(s.pay)/Math.max(1,Number(s.hours))))}/ч</small></span><strong>${fmtMoney(s.pay)}</strong><button type="button" data-remove-calendar-shift="${s.id}" aria-label="Удалить смену">×</button></div>`).join("");$("#dayTasks").appendChild(wrap);wrap.querySelectorAll("[data-remove-calendar-shift]").forEach(b=>b.addEventListener("click",()=>{data.shifts=data.shifts.filter(x=>x.id!==Number(b.dataset.removeCalendarShift));persist();renderAll()}))}
}
function renderCalendarShiftOptions(){
 const select=$("#calendarShiftType");
 select.innerHTML=data.shiftTypes.length?data.shiftTypes.map(t=>`<option value="${t.id}">${escapeHtml(t.name)} — ${fmtMoney(t.rate)}/ч</option>`).join(""):'<option value="">Сначала создай тип смены</option>';
 $("#showCalendarShiftForm").disabled=!data.shiftTypes.length;
}
function renderToday(){const tasks=data.tasks.filter(t=>t.date===iso(today));renderTasks($("#allTasks"),tasks,"На сегодня пока нет дел. Хороший момент добавить что-нибудь важное.");$("#taskCount").textContent=`${tasks.length} ${tasks.length===1?"дело":tasks.length<5?"дела":"дел"}`}
function renderSchool(){renderTasks($("#schoolTasks"),data.tasks.filter(t=>t.type==="school"),"Здесь появятся твои задания по предметам.")}
function renderShiftTypes(){
 $("#shiftTypeList").innerHTML=data.shiftTypes.length?data.shiftTypes.map(t=>`<div class="shift-type-row"><span class="shift-type-icon">◷</span><span class="shift-type-name"><strong>${escapeHtml(t.name)}</strong><small>${fmtMoney(t.rate)} в час</small></span><button type="button" data-delete-shift-type="${t.id}" aria-label="Удалить тип смены">×</button></div>`).join(""):'<div class="empty-state">Пока нет типов смен. Добавь, например, «Грин» и ставку в час.</div>';
 $$("[data-delete-shift-type]").forEach(b=>b.addEventListener("click",()=>{const id=Number(b.dataset.deleteShiftType);if(data.shifts.some(s=>Number(s.typeId)===id)){alert("Сначала удали смены этого типа из календаря.");return}data.shiftTypes=data.shiftTypes.filter(t=>t.id!==id);persist();renderAll() }));
}
function renderWork(){
 const month=String(viewDate.getMonth()+1).padStart(2,"0"),year=viewDate.getFullYear();
 const shifts=data.shifts.filter(s=>s.date.startsWith(`${year}-${month}`));
 $("#shiftCount").textContent=shifts.length;$("#hoursCount").textContent=shifts.reduce((n,s)=>n+Number(s.hours),0);$("#incomeCount").textContent=fmtMoney(shifts.reduce((n,s)=>n+Number(s.pay),0));
 $("#shiftList").innerHTML=data.shifts.length?data.shifts.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(s=>`<div class="shift-row"><span>◷</span><span><strong>${escapeHtml(s.name||"Смена")}</strong><small>${new Date(s.date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}${s.startTime?" · "+formatTime12(s.startTime):""} · ${s.hours} ч × ${fmtMoney(s.rate ?? (Number(s.pay)/Math.max(1,Number(s.hours))))}/ч</small></span><strong>${fmtMoney(s.pay)}</strong>${s.startTime?"":`<label class="shift-time-edit"><span>Время начала</span><input type="time" data-shift-time-input="${s.id}" aria-label="Время начала смены"><button type="button" class="save-shift-time" data-save-shift-time="${s.id}">Сохранить</button></label>`}<button data-shift="${s.id}" aria-label="Удалить смену">×</button></div>`).join(""):'<div class="empty-state">Пока смен нет — выбери дату в календаре и добавь смену.</div>';
 $$("[data-shift]").forEach(b=>b.addEventListener("click",()=>{data.shifts=data.shifts.filter(s=>s.id!==Number(b.dataset.shift));persist();renderAll()}));
 $$("[data-save-shift-time]").forEach(b=>b.addEventListener("click",()=>{const id=Number(b.dataset.saveShiftTime),input=document.querySelector(`[data-shift-time-input="${id}"]`),shift=data.shifts.find(s=>s.id===id);if(shift&&input&&input.value){shift.startTime=input.value;persist();renderAll()}else if(input){input.focus()}}));
 renderShiftTypes();
}
function calculateSavings(){const g=data.goal,amount=Math.max(1,Number(g.amount)||1),saved=Math.max(0,Number(g.saved)||0),left=Math.max(0,amount-saved),pct=Math.min(100,Math.round(saved/amount*100));$("#goalTitle").textContent=g.name||"Моя цель ♡";$("#savedBig").textContent=fmtMoney(saved);$("#goalBig").textContent=fmtMoney(amount);$("#progressFill").style.width=pct+"%";$("#progressText").textContent=pct+"% накоплено";$("#leftText").textContent=left===0?"Цель достигнута ♡":"Осталось "+fmtMoney(left);$("#goalName").value=g.name;$("#goalAmount").value=g.amount;$("#savedAmount").value=g.saved;$("#goalDate").value=g.date;$("#savePerShift").value=g.savePerShift;let weeks=1;if(g.date){const days=Math.ceil((new Date(g.date+"T23:59:59")-today)/86400000);weeks=Math.max(1,Math.ceil(days/7))}const weekly=left===0?0:Math.ceil(left/weeks);$("#weeklySave").textContent=fmtMoney(weekly);const perShift=Math.max(0,Number(g.savePerShift)||0);$("#weeklyShifts").textContent=left===0?"0":perShift>0?String(Math.ceil(weekly/perShift))+" смен":"укажи сумму";$("#goalDate").min=iso(today)}
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
$("#taskForm").addEventListener("submit",e=>{e.preventDefault();addTask($("#taskInput").value,"task",selectedDate,$("#taskTime").value);$("#taskInput").value="";$("#taskTime").value=""});
$("#todayForm").addEventListener("submit",e=>{e.preventDefault();addTask($("#todayInput").value,"task",iso(today),$("#todayTime").value);$("#todayInput").value="";$("#todayTime").value=""});
$("#schoolForm").addEventListener("submit",e=>{e.preventDefault();addTask($("#schoolInput").value,"school",iso(today));$("#schoolInput").value=""});
$("#shiftTypeForm").addEventListener("submit",e=>{e.preventDefault();const name=$("#shiftTypeName").value.trim(),rate=Number($("#shiftTypeRate").value);if(!name||rate<=0)return;data.shiftTypes.push({id:Date.now(),name,rate});persist();e.target.reset();renderAll()});
$("#showCalendarShiftForm").addEventListener("click",()=>{if(!data.shiftTypes.length){switchPage("work");$("#shiftTypeName").focus();return}const form=$("#calendarShiftForm");form.hidden=!form.hidden;$("#showCalendarShiftForm").textContent=form.hidden?"＋ Добавить смену":"Скрыть форму";renderCalendarShiftOptions()});
$("#calendarShiftForm").addEventListener("submit",e=>{e.preventDefault();const type=data.shiftTypes.find(t=>t.id===Number($("#calendarShiftType").value));const hours=Number($("#calendarShiftHours").value);if(!type||hours<1)return;data.shifts.push({id:Date.now(),typeId:type.id,name:type.name,rate:type.rate,date:selectedDate,startTime:$("#calendarShiftTime").value,hours,pay:hours*type.rate});persist();renderAll();$("#calendarShiftForm").hidden=true});
$("#saveSettings").addEventListener("click",()=>{data.goal={name:$("#goalName").value.trim()||"Моя цель ♡",amount:Math.max(1,Number($("#goalAmount").value)||1),saved:Math.max(0,Number($("#savedAmount").value)||0),date:$("#goalDate").value||iso(new Date(today.getFullYear(),today.getMonth()+6,today.getDate())),savePerShift:Math.max(0,Number($("#savePerShift").value)||0)};persist();calculateSavings();$("#saveSettings").textContent="План обновлён ✓";setTimeout(()=>$("#saveSettings").textContent="Пересчитать план",1500)});
$("#depositForm").addEventListener("submit",e=>{e.preventDefault();const n=Number($("#depositInput").value);if(n>0){data.goal.saved=Number(data.goal.saved||0)+n;$("#savedAmount").value=data.goal.saved;persist();calculateSavings();$("#depositInput").value=""}});
let edgeStart=null;document.addEventListener("touchstart",e=>{if(e.touches[0].clientX<22)edgeStart=e.touches[0].clientX},{passive:true});document.addEventListener("touchend",e=>{if(edgeStart!==null&&e.changedTouches[0].clientX-edgeStart>55){$("#sidebar").classList.add("open");$("#scrim").classList.add("show")}edgeStart=null},{passive:true});
let calStart=null;$(".calendar-panel").addEventListener("touchstart",e=>{calStart={x:e.changedTouches[0].screenX,y:e.changedTouches[0].screenY}},{passive:true});$(".calendar-panel").addEventListener("touchend",e=>{if(!calStart)return;const dx=e.changedTouches[0].screenX-calStart.x,dy=e.changedTouches[0].screenY-calStart.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.25){viewDate.setMonth(viewDate.getMonth()+(dx<0?1:-1));renderCalendar()}calStart=null},{passive:true});
renderAll();
