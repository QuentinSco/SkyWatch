export const COUNTRY_REGION = {
  USA:'AMN', CAN:'AMN', MEX:'AMN',
  BRA:'AMS', ARG:'AMS', PER:'AMS', VEN:'AMS', COL:'AMS', CHL:'AMS', BOL:'AMS', ECU:'AMS', URY:'AMS', PRY:'AMS',
  GLP:'AMO', MTQ:'AMO', GUF:'AMO', HTI:'AMO', CUB:'AMO', DOM:'AMO', JAM:'AMO',
  FRA:'EUR', DEU:'EUR', ESP:'EUR', ITA:'EUR', GBR:'EUR', PRT:'EUR', NLD:'EUR', BEL:'EUR',
  CHE:'EUR', AUT:'EUR', POL:'EUR', ROU:'EUR', HRV:'EUR', MNE:'EUR', MKD:'EUR', UKR:'EUR', RUS:'EUR',
  CHN:'ASIE', JPN:'ASIE', IND:'ASIE', IDN:'ASIE', THA:'ASIE', VNM:'ASIE', KOR:'ASIE', PHL:'ASIE',
  AUS:'ASIE', NZL:'ASIE', MDG:'ASIE', REU:'ASIE', MUS:'ASIE', MYT:'ASIE',
  KEN:'ASIE', SEN:'ASIE', CMR:'ASIE', NGA:'ASIE', CIV:'ASIE', ETH:'ASIE', ZAF:'ASIE', MOZ:'ASIE',
  AFG:'ASIE', KAZ:'ASIE', UZB:'ASIE', TKM:'ASIE',
};

export const AF_AIRPORTS = {
  USA:['KJFK','KLAX','KORD','KIAD','KMIA','KBOS','KSFO'],
  CAN:['CYYZ','CYVR','CYMX'], MEX:['MMMX'],
  BRA:['SBGR','SBRJ','SBBE'], ARG:['SAEZ'], VEN:['SVMI'], PER:['SPJC'],
  GLP:['TFFR'], MTQ:['TFFF'], GUF:['SOCA'], HTI:['MTPP'],
  FRA:['LFPG','LFPO','LFLL','LFLY','LFMN','LFRS'],
  DEU:['EDDF','EDDM','EDDB'], ESP:['LEMD','LEBL'], ITA:['LIRF','LIML'],
  GBR:['EGLL','EGKK'], PRT:['LPPT'],
  CHN:['ZBAA','ZSPD','ZGGG'], JPN:['RJTT','RJAA'], IND:['VIDP','VABB'],
  IDN:['WIII','WADD'], AUS:['YSSY','YMML'], NZL:['NZAA'],
  KEN:['HKJK'], SEN:['GOBD'], CMR:['FKYS'], MOZ:['FQMA'],
  REU:['FMEE'], MUS:['FIMP'], MDG:['FMMI'],
};

export function getRegion(iso3) { return COUNTRY_REGION[iso3] ?? 'ASIE'; }
export function getAirports(iso3) { return AF_AIRPORTS[iso3] ?? []; }

export function levelToSeverity(level) {
  if (level >= 3) return 'red';
  if (level === 2) return 'orange';
  return 'yellow';
}

export function noaaSeverity(event) {
  const e = event.toLowerCase();
  if (e.includes('warning')) return 'red';
  if (e.includes('watch'))   return 'orange';
  return 'yellow';
}

export function parseSubject(subject) {
  const m = subject.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { type: m[1], level: parseInt(m[2], 10) };
}

export function regionFromCoords(lat, lon) {
  if (lat < 0  && lon > 40  && lon < 100)               return 'ASIE';
  if (lat > 0  && lat < 35  && lon > -100 && lon < -50) return 'AMO';
  if (lat > 20 && lon > -170 && lon < -50)               return 'AMN';
  if (lat < 20 && lat > -60 && lon > -85  && lon < -30) return 'AMS';
  if (lat > 35 && lat < 72  && lon > -15  && lon < 45)  return 'EUR';
  return 'ASIE';
}

export function airportsFromCoords(lat, lon) {
  if (lat < 0 && lon > 40  && lon < 100)                return ['FMEE','FIMP','FMMI','FMCH'];
  if (lat > 0 && lat < 35  && lon > -100 && lon < -50)  return ['TFFR','TFFF','SOCA','KMIA'];
  if (lon > 100 && lon < 180 && lat > 0  && lat < 40)   return ['RJTT','WIII','RPLL','VHHH'];
  if (lat < 0 && lon > 150)                              return ['YSSY','NZAA'];
  return [];
}

export function basinFromCoords(lat, lon) {
  if (lat < 0  && lon > 40  && lon < 100)               return 'Océan Indien SW';
  if (lat > 0  && lat < 35  && lon > -100 && lon < -50) return 'Caraïbes';
  if (lon > 100 && lon < 180 && lat > 0  && lat < 40)   return 'Pacifique Ouest';
  if (lat < 0  && lon > 150)                             return 'Pacifique Sud';
  return 'Océan tropical';
}

export function getText(xml, tag) {
  const patterns = [
    new RegExp(`<gdacs:${tag}[^>]*>([\\s\\S]*?)<\\/gdacs:${tag}>`, 'i'),
    new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)<\\/dc:${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
  ];
  for (const p of patterns) {
    const m = xml.match(p);
    if (m) return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }
  return '';
}
