const str = '<select value={rescheduleYear} onChange={e => setRescheduleYear(Number(e.target.value))} className="border border-amber-200 rounded-lg px-3 py-2 outline-none">';
const res = str.replace(/<select\s+([^>]*?)className="([^"]+)"/g, (match, p1, p2) => {
    let newClass = p2;
    if (!newClass.includes('whitespace-normal')) newClass += ' whitespace-normal break-words max-w-full';
    return `<select ${p1}className="${newClass}"`;
  });
console.log(res);
