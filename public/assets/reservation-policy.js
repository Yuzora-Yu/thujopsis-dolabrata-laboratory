export const firstReservationDate = '2026-11-02';
export const lastReservationDate = '2027-12-31';

// National holidays and substitute holidays within the published booking window.
// https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html
const holidayDates = new Set([
 '2026-11-03', '2026-11-23',
 '2027-01-01', '2027-01-11', '2027-02-11', '2027-02-23', '2027-03-21', '2027-03-22',
 '2027-04-29', '2027-05-03', '2027-05-04', '2027-05-05', '2027-07-19', '2027-08-11',
 '2027-09-20', '2027-09-23', '2027-10-11', '2027-11-03', '2027-11-23',
]);

const start = '09:00';
const weekdayHours = {start, close:'21:00', lastStart:'20:00'};
const holidayHours = {start, close:'18:00', lastStart:'17:00'};
const unselectedHours = {start, close:'', lastStart:''};
export const workshopHours = {start, close:'17:00', lastStart:'16:00'};
export const venueOpeningHours = `平日 ${start}–${weekdayHours.close}／土・日・祝日 ${start}–${holidayHours.close}`;

export const reservationSpaces = [
 ['meeting-a','会議室 A'], ['meeting-b','会議室 B'],
 ['meeting-c','会議室 C'], ['meeting-d','会議室 D'],
 ['workshop','工房'], ['presentation','プレゼンテーションホール'], ['hall','3階ホール'],
];

function bookingDate(date){
 if(typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date<firstReservationDate || date>lastReservationDate) return null;
 // Interpret the selected civil date consistently in both runtimes.
 const day = new Date(date+'T00:00:00Z');
 return !Number.isNaN(day.getTime()) && day.toISOString().slice(0,10)===date ? day : null;
}

export function reservationHours(space,date){
 if(space==='workshop') return workshopHours;
 const day = bookingDate(date);
 if(!day) return unselectedHours;
 const weekday = day.getUTCDay();
 return weekday===0 || weekday===6 || holidayDates.has(date) ? holidayHours : weekdayHours;
}

export function reservationHoursHint(space,date){
 const {start,lastStart,close} = reservationHours(space,date);
 if(!lastStart) return '利用日を選ぶと、その日に申請できる開始時刻を表示いたします。';
 const desk = space==='workshop' ? '工房受付' : '施設のご利用';
 return `申請できる開始時刻は ${start}〜${lastStart} です。${desk}は${close}までです。`;
}

export function isValidReservation({space,date,time,end_time:finish,purpose}){
 if(!reservationSpaces.some(([id])=>id===space) || typeof purpose!=='string' || !purpose.trim())return false;
 if(!bookingDate(date))return false;
 const timeFormat=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
 if(!timeFormat.test(time || '') || !timeFormat.test(finish || ''))return false;
 const {start,lastStart,close} = reservationHours(space,date);
 return time>=start && time<=lastStart && finish>time && finish<=close;
}

export function updateReservationHours(form){
 const {space,date,time} = form.elements;
 const {start,lastStart,close} = reservationHours(space.value,date.value);
 time.min = start;
 if(lastStart) time.max = lastStart;
 else time.removeAttribute('max');
 const outsideHours = time.validity.rangeUnderflow || time.validity.rangeOverflow;
 if(outsideHours) time.setAttribute('aria-invalid','true');
 else time.removeAttribute('aria-invalid');
 const hint = form.querySelector('[data-reservation-hours]');
 const correction = outsideHours ? ' 入力した開始時刻を変更してください。' : '';
 const text = reservationHoursHint(space.value,date.value)+correction;
 if(hint.textContent!==text)hint.textContent=text;
 const finish=form.elements.namedItem('end_time');
 if(finish){
  const timeFormat=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
  // A late start must not turn the native time range into an overnight range.
  finish.min=timeFormat.test(time.value)&&!outsideHours?time.value:start;
  if(close)finish.max=close;
  else finish.removeAttribute('max');
  const beforeStart=timeFormat.test(time.value)&&timeFormat.test(finish.value)&&finish.value<=time.value;
  finish.setCustomValidity(beforeStart?'終了時刻は開始時刻より後にしてください。':'');
  const invalidFinish=beforeStart||finish.validity.rangeUnderflow||finish.validity.rangeOverflow;
  if(invalidFinish)finish.setAttribute('aria-invalid','true');
  else finish.removeAttribute('aria-invalid');
  const endHint=form.querySelector('[data-reservation-end-hours]');
  const endText='準備・撤収を含む利用時間をご入力ください。'+(invalidFinish?' 入力した終了時刻を変更してください。':'');
  if(endHint&&endHint.textContent!==endText)endHint.textContent=endText;
 }
}
