export const firstReservationDate = '2026-11-02';

export const reservationSpaces = [
 ['meeting-a','会議室 A'], ['meeting-b','会議室 B'],
 ['meeting-c','会議室 C'], ['meeting-d','会議室 D'],
 ['workshop','工房'], ['presentation','プレゼンテーションホール'], ['hall','3階ホール'],
];

export function reservationHours(space){
 const start = '09:00';
 return {start, lastStart: space==='workshop' ? '16:00' : '20:00'};
}

export function reservationHoursHint(space){
 const {start,lastStart} = reservationHours(space);
 return space==='workshop'
  ? `工房の開始時刻は ${start}〜${lastStart} です。工房受付は17:00までです。`
  : `申請できる開始時刻は ${start}〜${lastStart} です。`;
}

export function isValidReservation({space,date,time,purpose}){
 if(!reservationSpaces.some(([id])=>id===space) || typeof purpose!=='string' || !purpose.trim())return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date<firstReservationDate)return false;
 const calendarDate = new Date(date+'T00:00:00Z');
 if(Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0,10)!==date)return false;
 if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || ''))return false;
 const {start,lastStart} = reservationHours(space);
 return time>=start && time<=lastStart;
}

export function updateReservationHours(form){
 const {space,time} = form.elements;
 const {start,lastStart} = reservationHours(space.value);
 time.min = start;
 time.max = lastStart;
 const hint = form.querySelector('[data-reservation-hours]');
 const text = reservationHoursHint(space.value);
 if(hint.textContent!==text)hint.textContent=text;
}
