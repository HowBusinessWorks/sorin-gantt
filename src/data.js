// Initial data for 26 construction projects (monthly based)
export const initialTasks = [
  { id: 1, name: "Uzina Arcuda - Reabilitare interioara cladiri filtre vechi si noi / IDEM 3", startMonth: 0, duration: 3, progress: 15, stages: [
    { id: 101, name: "Demolare si pregatire", startMonth: 0, duration: 1 },
    { id: 102, name: "Instalatii noi", startMonth: 1, duration: 1 },
    { id: 103, name: "Finisaje interioare", startMonth: 2, duration: 1 }
  ] },
  { id: 2, name: "Uzina Arcuda - Reparatii si zugraveli exterioare cladiri filtre (acuitate vizuala)", startMonth: 1, duration: 2, progress: 0, stages: [] },
  { id: 3, name: "Uzina Arcuda - Reabilitare filtre rapide vechi - FR 3, 4 IDEM 1", startMonth: 2, duration: 4, progress: 25, stages: [
    { id: 301, name: "Evaluare si diagnoza", startMonth: 2, duration: 1 },
    { id: 302, name: "Reparatii structurale", startMonth: 3, duration: 2 },
    { id: 303, name: "Teste si punere in functiune", startMonth: 5, duration: 1 }
  ] },
  { id: 4, name: "Uzina Arcuda - Reabilitare exterioara statia acid", startMonth: 0, duration: 2, progress: 60, stages: [] },
  { id: 5, name: "Uzina Arcuda - Reabilitare exterioara statia clor", startMonth: 1, duration: 2, progress: 80, stages: [] },
  { id: 6, name: "Uzina Arcuda - Reabilitare scara dispecerat", startMonth: 3, duration: 2, progress: 0, stages: [] },
  { id: 7, name: "Uzina Arcuda - Reabilitare grup sanitar cladire administrativa", startMonth: 2, duration: 1, progress: 100, stages: [] },
  { id: 8, name: "Uzina Crivina - Reabilitare acoperis statie Chimica", startMonth: 4, duration: 3, progress: 0, stages: [] },
  { id: 9, name: "NH Ciorogarla - Reabilitare sifonare apa potabila", startMonth: 3, duration: 2, progress: 35, stages: [] },
  { id: 10, name: "Baraj Crivina - Reparatii pile fuziforme desnisipatoare etapa 2", startMonth: 5, duration: 3, progress: 0, stages: [] },
  { id: 11, name: "SP Sud - R3 (26000 mc) - reparatii atic deplasat, sistem pluvial cu protectii", startMonth: 1, duration: 4, progress: 45, stages: [] },
  { id: 12, name: "SP Sud - R3 - reparatii grinzi - reabilitare totala", startMonth: 4, duration: 5, progress: 20, stages: [] },
  { id: 13, name: "SP Sud - R4 - tencuieli exterioare", startMonth: 2, duration: 2, progress: 70, stages: [] },
  { id: 14, name: "SP Nord - R1 - reparatii tencuieli exterioare si trotuarele de garda, scari si usi acces; statia de golire - reparatie trotuar de garda", startMonth: 6, duration: 3, progress: 0, stages: [] },
  { id: 15, name: "SP Nord - Reparatii fatada intrare statie, reparatii zugraveli interioare casa scarilor (infiltratii)", startMonth: 3, duration: 2, progress: 55, stages: [] },
  { id: 16, name: "SP Nord - Reparatii punctiforme in sala pompelor si reparatii rosturi dilatare a constructiei", startMonth: 5, duration: 2, progress: 30, stages: [] },
  { id: 17, name: "SP Nord - Cabine foraje - termoizolatie - 7 buc. si acces pt prelevare probe (dale sau pietris)", startMonth: 7, duration: 2, progress: 0, stages: [] },
  { id: 18, name: "SP Nord - Reparatii si zugraveli interior/exterior camere stavilar/vane", startMonth: 4, duration: 3, progress: 40, stages: [] },
  { id: 19, name: "SP Grivita - R1 si R2 - refacere hidroizolatie rezervoare", startMonth: 8, duration: 3, progress: 0, stages: [] },
  { id: 20, name: "SP Grivita - CS1 si CS2 - reparatie trotuare de garda", startMonth: 6, duration: 2, progress: 10, stages: [] },
  { id: 21, name: "SP Drumul Taberei - Sistem drenaj apa pluviala rezervoare R1 si R2", startMonth: 5, duration: 2, progress: 65, stages: [] },
  { id: 22, name: "SP Preciziei - Reparatii si zugraveli interioare in sala pompelor", startMonth: 7, duration: 2, progress: 0, stages: [] },
  { id: 23, name: "SP Uverturii - Reparatii si zugraveli interioare in sala pompelor", startMonth: 9, duration: 2, progress: 0, stages: [] },
  { id: 24, name: "SP Sud - Reparatii si zugraveli fatada statiei", startMonth: 8, duration: 2, progress: 25, stages: [] },
  { id: 25, name: "Rezervoare Cotroceni - Reabilitare totala interioara R1C3", startMonth: 10, duration: 2, progress: 0, stages: [] },
  { id: 26, name: "Refacere terasa exterioara", startMonth: 9, duration: 3, progress: 15, stages: [] }
];

// Month data
export const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
export const monthsShort = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Constants for weekly view (4 weeks per month)
export const cellWidth = 28; // 30px per week
export const rowHeight = 48; // Height accounting for padding
export const totalMonths = 12;
export const weeksPerMonth = 4;
export const totalWeeks = totalMonths * weeksPerMonth; // 48 weeks