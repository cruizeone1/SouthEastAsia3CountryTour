
(()=>{'use strict';
const config=JSON.parse(document.getElementById('day-weather-config').textContent),root=document.getElementById('day-weather'),days=config.dates;
const e=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const label=e('label','Jump to a day · full checklist stays visible');label.htmlFor='itinerary-day';const select=e('select');select.id='itinerary-day';
if(config.kind==='singapore'){const o=e('option','All itinerary days');o.value='all';select.append(o);}
const formatDate=d=>new Intl.DateTimeFormat('en-SG',{timeZone:config.timezone,weekday:'long',day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00Z'));
days.forEach(d=>{const o=e('option',formatDate(d));o.value=d;select.append(o);});
const controls=e('div');controls.className='day-weather-controls';const go=e('button','Go to day ↓');go.type='button';go.className='btn btn-primary';const refresh=e('button','Refresh weather');refresh.type='button';refresh.className='btn btn-outline';controls.append(select,go,refresh);
const heading=e('h2','Weather for your day');heading.id='weather-heading';const output=e('p','Choose a day to load its weather.');output.id='selected-day-weather';output.setAttribute('role','status');output.setAttribute('aria-live','polite');const stamp=e('p');stamp.className='mini';const source=e('p');source.className='mini';const link=e('a','Open-Meteo');link.href='https://open-meteo.com/';link.target='_blank';link.rel='noopener';source.append(document.createTextNode('Weather: '),link,document.createTextNode(' · Daily city-area estimates, not an hourly rain schedule. Air quality is shown separately where available.'));
root.append(label,controls,heading,output,stamp,source);
const todayParts=new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=t=>todayParts.find(p=>p.type===t).value;const today=part('year')+'-'+part('month')+'-'+part('day');
select.value=days.includes(today)?today:today<days[0]?days[0]:days[days.length-1];
let token=0,active=null;const cache=new Map();
const weatherCode=code=>({0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Rain showers',82:'Heavy rain showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorms possible',96:'Thunderstorms with hail possible',99:'Thunderstorms with hail possible'}[code]||'Conditions unavailable');
const finite=v=>typeof v==='number'&&Number.isFinite(v);const f=c=>Math.round(c*9/5+32);
function target(date){if(config.kind==='singapore')return document.querySelector('.day-section[data-date="'+date.slice(-2).replace(/^0/,'')+'"]');return document.getElementById(date.endsWith('15')?'timeline':'airport');}
function inline(text){document.querySelectorAll('.weather-day-summary').forEach(n=>n.remove());if(select.value==='all')return;const section=target(select.value);if(section){const p=e('p',text);p.className='notice weather-day-summary';section.prepend(p);}}
function show(text){output.textContent=text;inline(text);}
function navigate(jump){
 const date=select.value;
 document.querySelectorAll('.day-section,.panel').forEach(section=>section.hidden=false);
 if(config.kind==='singapore')document.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.day===(date==='all'?'all':date.slice(-2).replace(/^0/,'')))));
 if(jump)(date==='all'?document.getElementById('itinerary'):target(date))?.scrollIntoView({behavior:'smooth',block:'start'});
}
function paint(data,date,past,historical){
 const d=data.daily,i=d?.time?.indexOf(date);if(i===undefined||i<0||!finite(d.temperature_2m_min?.[i])||!finite(d.temperature_2m_max?.[i]))throw Error('No valid daily data');
 const low=d.temperature_2m_min[i],high=d.temperature_2m_max[i],prob=d.precipitation_probability_max?.[i],rain=d.precipitation_sum?.[i];
 let text=(past?'Past weather estimate':'Forecast')+' · '+formatDate(date)+' · '+weatherCode(d.weather_code?.[i])+' · '+Math.round(low)+'–'+Math.round(high)+'°C / '+f(low)+'–'+f(high)+'°F';
 if(!past&&finite(prob))text+=' · Peak hourly rain chance '+Math.round(prob)+'%';
 if(finite(rain))text+=' · '+rain.toFixed(1)+' mm '+(past?'estimated rainfall':'forecast rainfall');
 heading.textContent=(past?'Past weather estimate':'Daily weather forecast')+' · '+config.city;show(text);
 stamp.textContent='Retrieved '+new Intl.DateTimeFormat('en-SG',{timeZone:config.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date())+' ('+config.timezone+')'+(historical?' · Historical model/reanalysis data':'')+'.';
}
async function load(force=false){
 const date=select.value,myToken=++token;if(active)active.abort();
 if(date==='all'){heading.textContent='Weather by date';show('Choose a specific day to see its weather.');stamp.textContent='';return;}
 const past=date<today,diff=(Date.parse(today)-Date.parse(date))/86400000,historical=diff>7;
 if(!force&&cache.has(date)){paint(cache.get(date),date,past,historical);return;}
 show('Loading weather for '+formatDate(date)+'…');stamp.textContent='';active=new AbortController();const controller=active,timer=setTimeout(()=>controller.abort(),15000);
 try{const params=new URLSearchParams({latitude:String(config.latitude),longitude:String(config.longitude),daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum'+(historical?'':',precipitation_probability_max'),start_date:date,end_date:date,timezone:config.timezone});const endpoint=historical?'https://archive-api.open-meteo.com/v1/archive':'https://api.open-meteo.com/v1/forecast';const response=await fetch(endpoint+'?'+params,{signal:controller.signal});if(!response.ok)throw Error('Weather unavailable');const data=await response.json();if(myToken!==token)return;paint(data,date,past,historical);cache.set(date,data);
 }catch(error){if(myToken!==token)return;heading.textContent='Weather unavailable · '+config.city;show('Could not load weather for '+formatDate(date)+'. Tap Refresh weather or check the forecast source.');stamp.textContent='No weather values are being shown.';}finally{clearTimeout(timer);}
}
select.addEventListener('change',()=>{navigate(true);load();});go.addEventListener('click',()=>navigate(true));refresh.addEventListener('click',()=>load(true));
if(config.kind==='singapore'){document.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>{select.value=button.dataset.day==='all'?'all':'2026-10-'+button.dataset.day;load();}));}
else{document.querySelectorAll('[data-tab],[data-switch]').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.tab||button.dataset.switch;if(tab==='timeline'||tab==='airport'){select.value=tab==='timeline'?days[0]:days[1];load();}}));}

const jumpNav=e('nav');jumpNav.className='quicklinks';jumpNav.setAttribute('aria-label','Jump within this city checklist');jumpNav.style.margin='12px 0';
days.forEach(date=>{const b=e('button',formatDate(date));b.type='button';b.className='btn btn-soft small';b.addEventListener('click',()=>{select.value=date;navigate(true);load();});jumpNav.append(b);});
for(const [id,title] of [['trip-tickets','Tickets ↓'],['cable-to-oceanarium','Cable car directions ↓'],['saturday-transport','Transfers ↓']]){const dest=document.getElementById(id);if(dest){const b=e('button',title);b.type='button';b.className='btn btn-outline small';b.addEventListener('click',()=>dest.scrollIntoView({behavior:'smooth',block:'start'}));jumpNav.append(b);}}
root.insertBefore(jumpNav,heading);
const activityLabel=e('label','Jump to an activity');activityLabel.htmlFor='itinerary-activity';activityLabel.style.display='block';activityLabel.style.marginTop='12px';
const activitySelect=e('select');activitySelect.id='itinerary-activity';activitySelect.style.maxWidth='100%';
function fillActivities(){const previous=activitySelect.value;activitySelect.replaceChildren();const placeholder=e('option','Choose an activity…');placeholder.value='';activitySelect.append(placeholder);document.querySelectorAll('.stop[data-stop]').forEach(article=>{if(!article.id)article.id='activity-'+article.dataset.stop;const o=e('option',(article.closest('[data-date]')?'Oct '+article.closest('[data-date]').dataset.date+' · ':'')+(article.querySelector('h3')?.textContent||article.dataset.stop));o.value=article.id;activitySelect.append(o);});if([...activitySelect.options].some(o=>o.value===previous))activitySelect.value=previous;}
activitySelect.addEventListener('change',()=>{if(activitySelect.value)document.getElementById(activitySelect.value)?.scrollIntoView({behavior:'smooth',block:'start'});});
root.insertBefore(activityLabel,heading);root.insertBefore(activitySelect,heading);fillActivities();document.addEventListener('itinerary:updated',fillActivities);

navigate(false);load();
})();