import { calculateDistanceMeters } from '../utils/propertyMath';

export interface TransitStop {
  id: string;
  name: string;
  code: string;
  type: 'MRT' | 'LRT' | 'BUS';
  lines?: string[]; // e.g. ['EW', 'DT'] or bus numbers
  road?: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  walkMinutes: number;
}

// Singapore MRT and LRT Stations
export const SINGAPORE_MRT_LRT = [
  // East-West Line (EW)
  { name: 'Pasir Ris', code: 'EW1', type: 'MRT' as const, lines: ['EW'], lat: 1.3730, lng: 103.9493 },
  { name: 'Tampines', code: 'EW2 / DT32', type: 'MRT' as const, lines: ['EW', 'DT'], lat: 1.3532, lng: 103.9452 },
  { name: 'Tampines East', code: 'DT33', type: 'MRT' as const, lines: ['DT'], lat: 1.3562, lng: 103.9546 },
  { name: 'Tampines West', code: 'DT31', type: 'MRT' as const, lines: ['DT'], lat: 1.3456, lng: 103.9384 },
  { name: 'Simei', code: 'EW3', type: 'MRT' as const, lines: ['EW'], lat: 1.3432, lng: 103.9533 },
  { name: 'Tanah Merah', code: 'EW4', type: 'MRT' as const, lines: ['EW', 'CG'], lat: 1.3272, lng: 103.9463 },
  { name: 'Bedok', code: 'EW5', type: 'MRT' as const, lines: ['EW'], lat: 1.3240, lng: 103.9300 },
  { name: 'Bedok Reservoir', code: 'DT30', type: 'MRT' as const, lines: ['DT'], lat: 1.3364, lng: 103.9329 },
  { name: 'Bedok North', code: 'DT29', type: 'MRT' as const, lines: ['DT'], lat: 1.3347, lng: 103.9180 },
  { name: 'Kembangan', code: 'EW6', type: 'MRT' as const, lines: ['EW'], lat: 1.3210, lng: 103.9129 },
  { name: 'Eunos', code: 'EW7', type: 'MRT' as const, lines: ['EW'], lat: 1.3197, lng: 103.9031 },
  { name: 'Paya Lebar', code: 'EW8 / CC9', type: 'MRT' as const, lines: ['EW', 'CC'], lat: 1.3182, lng: 103.8931 },
  { name: 'Aljunied', code: 'EW9', type: 'MRT' as const, lines: ['EW'], lat: 1.3164, lng: 103.8829 },
  { name: 'Kallang', code: 'EW10', type: 'MRT' as const, lines: ['EW'], lat: 1.3115, lng: 103.8714 },
  { name: 'Lavender', code: 'EW11', type: 'MRT' as const, lines: ['EW'], lat: 1.3074, lng: 103.8630 },
  { name: 'Bugis', code: 'EW12 / DT14', type: 'MRT' as const, lines: ['EW', 'DT'], lat: 1.3005, lng: 103.8560 },
  { name: 'City Hall', code: 'EW13 / NS25', type: 'MRT' as const, lines: ['EW', 'NS'], lat: 1.2930, lng: 103.8522 },
  { name: 'Raffles Place', code: 'EW14 / NS26', type: 'MRT' as const, lines: ['EW', 'NS'], lat: 1.2841, lng: 103.8515 },
  { name: 'Tanjong Pagar', code: 'EW15', type: 'MRT' as const, lines: ['EW'], lat: 1.2764, lng: 103.8457 },
  { name: 'Outram Park', code: 'EW16 / NE3 / TE17', type: 'MRT' as const, lines: ['EW', 'NE', 'TE'], lat: 1.2803, lng: 103.8395 },
  { name: 'Tiong Bahru', code: 'EW17', type: 'MRT' as const, lines: ['EW'], lat: 1.2864, lng: 103.8270 },
  { name: 'Redhill', code: 'EW18', type: 'MRT' as const, lines: ['EW'], lat: 1.2896, lng: 103.8168 },
  { name: 'Queenstown', code: 'EW19', type: 'MRT' as const, lines: ['EW'], lat: 1.2949, lng: 103.8060 },
  { name: 'Commonwealth', code: 'EW20', type: 'MRT' as const, lines: ['EW'], lat: 1.3025, lng: 103.7983 },
  { name: 'Buona Vista', code: 'EW21 / CC22', type: 'MRT' as const, lines: ['EW', 'CC'], lat: 1.3073, lng: 103.7900 },
  { name: 'Dover', code: 'EW22', type: 'MRT' as const, lines: ['EW'], lat: 1.3114, lng: 103.7786 },
  { name: 'Clementi', code: 'EW23', type: 'MRT' as const, lines: ['EW'], lat: 1.3151, lng: 103.7652 },
  { name: 'Jurong East', code: 'EW24 / NS1', type: 'MRT' as const, lines: ['EW', 'NS'], lat: 1.3331, lng: 103.7423 },
  { name: 'Chinese Garden', code: 'EW25', type: 'MRT' as const, lines: ['EW'], lat: 1.3424, lng: 103.7326 },
  { name: 'Lakeside', code: 'EW26', type: 'MRT' as const, lines: ['EW'], lat: 1.3443, lng: 103.7209 },
  { name: 'Boon Lay', code: 'EW27', type: 'MRT' as const, lines: ['EW'], lat: 1.3386, lng: 103.7060 },
  { name: 'Pioneer', code: 'EW28', type: 'MRT' as const, lines: ['EW'], lat: 1.3376, lng: 103.6973 },

  // North-South Line (NS)
  { name: 'Bukit Batok', code: 'NS2', type: 'MRT' as const, lines: ['NS'], lat: 1.3490, lng: 103.7496 },
  { name: 'Bukit Gombak', code: 'NS3', type: 'MRT' as const, lines: ['NS'], lat: 1.3587, lng: 103.7519 },
  { name: 'Choa Chu Kang', code: 'NS4 / BP1', type: 'MRT' as const, lines: ['NS', 'BP'], lat: 1.3854, lng: 103.7443 },
  { name: 'Yew Tee', code: 'NS5', type: 'MRT' as const, lines: ['NS'], lat: 1.3975, lng: 103.7474 },
  { name: 'Kranji', code: 'NS7', type: 'MRT' as const, lines: ['NS'], lat: 1.4251, lng: 103.7621 },
  { name: 'Marsiling', code: 'NS8', type: 'MRT' as const, lines: ['NS'], lat: 1.4325, lng: 103.7741 },
  { name: 'Woodlands', code: 'NS9 / TE2', type: 'MRT' as const, lines: ['NS', 'TE'], lat: 1.4368, lng: 103.7865 },
  { name: 'Admiralty', code: 'NS10', type: 'MRT' as const, lines: ['NS'], lat: 1.4406, lng: 103.8009 },
  { name: 'Sembawang', code: 'NS11', type: 'MRT' as const, lines: ['NS'], lat: 1.4491, lng: 103.8201 },
  { name: 'Canberra', code: 'NS12', type: 'MRT' as const, lines: ['NS'], lat: 1.4431, lng: 103.8297 },
  { name: 'Yishun', code: 'NS13', type: 'MRT' as const, lines: ['NS'], lat: 1.4294, lng: 103.8350 },
  { name: 'Khatib', code: 'NS14', type: 'MRT' as const, lines: ['NS'], lat: 1.4174, lng: 103.8329 },
  { name: 'Yio Chu Kang', code: 'NS15', type: 'MRT' as const, lines: ['NS'], lat: 1.3817, lng: 103.8449 },
  { name: 'Ang Mo Kio', code: 'NS16', type: 'MRT' as const, lines: ['NS'], lat: 1.3699, lng: 103.8496 },
  { name: 'Bishan', code: 'NS17 / CC15', type: 'MRT' as const, lines: ['NS', 'CC'], lat: 1.3508, lng: 103.8481 },
  { name: 'Braddell', code: 'NS18', type: 'MRT' as const, lines: ['NS'], lat: 1.3405, lng: 103.8468 },
  { name: 'Toa Payoh', code: 'NS19', type: 'MRT' as const, lines: ['NS'], lat: 1.3326, lng: 103.8475 },
  { name: 'Novena', code: 'NS20', type: 'MRT' as const, lines: ['NS'], lat: 1.3204, lng: 103.8438 },
  { name: 'Newton', code: 'NS21 / DT11', type: 'MRT' as const, lines: ['NS', 'DT'], lat: 1.3123, lng: 103.8380 },
  { name: 'Orchard', code: 'NS22 / TE14', type: 'MRT' as const, lines: ['NS', 'TE'], lat: 1.3040, lng: 103.8318 },
  { name: 'Somerset', code: 'NS23', type: 'MRT' as const, lines: ['NS'], lat: 1.3002, lng: 103.8390 },
  { name: 'Dhoby Ghaut', code: 'NS24 / NE6 / CC1', type: 'MRT' as const, lines: ['NS', 'NE', 'CC'], lat: 1.2987, lng: 103.8458 },
  { name: 'Marina Bay', code: 'NS27 / CC33 / TE20', type: 'MRT' as const, lines: ['NS', 'CC', 'TE'], lat: 1.2764, lng: 103.8546 },
  { name: 'Marina South Pier', code: 'NS28', type: 'MRT' as const, lines: ['NS'], lat: 1.2711, lng: 103.8636 },

  // Circle Line & Downtown Line key stations
  { name: 'Bayfront', code: 'DT16 / CE1', type: 'MRT' as const, lines: ['DT', 'CE'], lat: 1.2819, lng: 103.8590 },
  { name: 'Promenade', code: 'CC4 / DT15', type: 'MRT' as const, lines: ['CC', 'DT'], lat: 1.2933, lng: 103.8604 },
  { name: 'Esplanade', code: 'CC3', type: 'MRT' as const, lines: ['CC'], lat: 1.2935, lng: 103.8554 },
  { name: 'Stadium', code: 'CC6', type: 'MRT' as const, lines: ['CC'], lat: 1.3028, lng: 103.8753 },
  { name: 'Mountbatten', code: 'CC7', type: 'MRT' as const, lines: ['CC'], lat: 1.3063, lng: 103.8825 },
  { name: 'Dakota', code: 'CC8', type: 'MRT' as const, lines: ['CC'], lat: 1.3085, lng: 103.8885 },
  { name: 'Serangoon', code: 'NE12 / CC13', type: 'MRT' as const, lines: ['NE', 'CC'], lat: 1.3497, lng: 103.8737 },
  { name: 'Lorong Chuan', code: 'CC14', type: 'MRT' as const, lines: ['CC'], lat: 1.3516, lng: 103.8640 },
  { name: 'Marymount', code: 'CC16', type: 'MRT' as const, lines: ['CC'], lat: 1.3487, lng: 103.8394 },
  { name: 'Caldecott', code: 'CC17 / TE9', type: 'MRT' as const, lines: ['CC', 'TE'], lat: 1.3377, lng: 103.8396 },
  { name: 'Botanic Gardens', code: 'CC19 / DT9', type: 'MRT' as const, lines: ['CC', 'DT'], lat: 1.3223, lng: 103.8153 },
  { name: 'Farrer Road', code: 'CC20', type: 'MRT' as const, lines: ['CC'], lat: 1.3175, lng: 103.8074 },
  { name: 'Holland Village', code: 'CC21', type: 'MRT' as const, lines: ['CC'], lat: 1.3120, lng: 103.7962 },
  { name: 'one-north', code: 'CC23', type: 'MRT' as const, lines: ['CC'], lat: 1.2995, lng: 103.7873 },
  { name: 'Kent Ridge', code: 'CC24', type: 'MRT' as const, lines: ['CC'], lat: 1.2934, lng: 103.7845 },
  { name: 'Haw Par Villa', code: 'CC25', type: 'MRT' as const, lines: ['CC'], lat: 1.2826, lng: 103.7818 },
  { name: 'Pasir Panjang', code: 'CC26', type: 'MRT' as const, lines: ['CC'], lat: 1.2762, lng: 103.7915 },
  { name: 'Labrador Park', code: 'CC27', type: 'MRT' as const, lines: ['CC'], lat: 1.2722, lng: 103.8029 },
  { name: 'Telok Blangah', code: 'CC28', type: 'MRT' as const, lines: ['CC'], lat: 1.2707, lng: 103.8097 },
  { name: 'HarbourFront', code: 'NE1 / CC29', type: 'MRT' as const, lines: ['NE', 'CC'], lat: 1.2654, lng: 103.8218 },

  // North-East Line (NE) & Punggol / Sengkang LRT
  { name: 'Chinatown', code: 'NE4 / DT19', type: 'MRT' as const, lines: ['NE', 'DT'], lat: 1.2848, lng: 103.8440 },
  { name: 'Clarke Quay', code: 'NE5', type: 'MRT' as const, lines: ['NE'], lat: 1.2884, lng: 103.8465 },
  { name: 'Little India', code: 'NE7 / DT12', type: 'MRT' as const, lines: ['NE', 'DT'], lat: 1.3068, lng: 103.8492 },
  { name: 'Farrer Park', code: 'NE8', type: 'MRT' as const, lines: ['NE'], lat: 1.3123, lng: 103.8542 },
  { name: 'Boon Keng', code: 'NE9', type: 'MRT' as const, lines: ['NE'], lat: 1.3193, lng: 103.8617 },
  { name: 'Potong Pasir', code: 'NE10', type: 'MRT' as const, lines: ['NE'], lat: 1.3314, lng: 103.8690 },
  { name: 'Woodleigh', code: 'NE11', type: 'MRT' as const, lines: ['NE'], lat: 1.3392, lng: 103.8708 },
  { name: 'Kovan', code: 'NE13', type: 'MRT' as const, lines: ['NE'], lat: 1.3601, lng: 103.8850 },
  { name: 'Hougang', code: 'NE14', type: 'MRT' as const, lines: ['NE'], lat: 1.3713, lng: 103.8924 },
  { name: 'Buangkok', code: 'NE15', type: 'MRT' as const, lines: ['NE'], lat: 1.3829, lng: 103.8931 },
  { name: 'Sengkang', code: 'NE16 / STC', type: 'MRT' as const, lines: ['NE', 'SK'], lat: 1.3916, lng: 103.8953 },
  { name: 'Punggol', code: 'NE17 / PTC', type: 'MRT' as const, lines: ['NE', 'PG'], lat: 1.4052, lng: 103.9023 },
  { name: 'Sam Kee', code: 'PW1', type: 'LRT' as const, lines: ['PG'], lat: 1.4098, lng: 103.9048 },
  { name: 'Teck Lee', code: 'PW2', type: 'LRT' as const, lines: ['PG'], lat: 1.4128, lng: 103.9067 },
  { name: 'Punggol Point', code: 'PW3', type: 'LRT' as const, lines: ['PG'], lat: 1.4169, lng: 103.9066 },
  { name: 'Samudera', code: 'PW4', type: 'LRT' as const, lines: ['PG'], lat: 1.4158, lng: 103.9021 },
  { name: 'Nibong', code: 'PW5', type: 'LRT' as const, lines: ['PG'], lat: 1.4118, lng: 103.9002 },
  { name: 'Sumang', code: 'PW6', type: 'LRT' as const, lines: ['PG'], lat: 1.4085, lng: 103.8986 },
  { name: 'Soo Teck', code: 'PW7', type: 'LRT' as const, lines: ['PG'], lat: 1.4054, lng: 103.8973 },
  { name: 'Compassvale', code: 'SE1', type: 'LRT' as const, lines: ['SK'], lat: 1.3945, lng: 103.8998 },
  { name: 'Rumbia', code: 'SE2', type: 'LRT' as const, lines: ['SK'], lat: 1.3915, lng: 103.9060 },
  { name: 'Bakau', code: 'SE3', type: 'LRT' as const, lines: ['SK'], lat: 1.3881, lng: 103.9054 },
  { name: 'Tongkang', code: 'SW7', type: 'LRT' as const, lines: ['SK'], lat: 1.3893, lng: 103.8858 },
  { name: 'Layar', code: 'SW6', type: 'LRT' as const, lines: ['SK'], lat: 1.3921, lng: 103.8798 },
  { name: 'Fernvale', code: 'SW5', type: 'LRT' as const, lines: ['SK'], lat: 1.3919, lng: 103.8763 },
  { name: 'Thanggam', code: 'SW4', type: 'LRT' as const, lines: ['SK'], lat: 1.3973, lng: 103.8756 }
];

// Singapore Key Bus Stops Network
export const SINGAPORE_BUS_STOPS = [
  { id: 'bs-76059', name: 'Opp Tampines Stn / Int', code: '76059', road: 'Tampines Ave 4', lines: ['3', '15', '21', '27', '168'], lat: 1.3524, lng: 103.9438 },
  { id: 'bs-76191', name: 'Tampines Int', code: '76191', road: 'Tampines Central 1', lines: ['4', '8', '10', '19', '20', '29', '37', '38', '65', '67'], lat: 1.3541, lng: 103.9431 },
  { id: 'bs-76149', name: 'Opp Century Sq', code: '76149', road: 'Tampines Ave 5', lines: ['2', '3', '9', '12', '34', '39', '518'], lat: 1.3516, lng: 103.9449 },
  { id: 'bs-76121', name: 'Blk 938 Tampines Ave 5', code: '76121', road: 'Tampines Ave 5', lines: ['34', '59', '69', '72'], lat: 1.3486, lng: 103.9482 },
  { id: 'bs-76031', name: 'Blk 216 Tampines St 23', code: '76031', road: 'Tampines St 23', lines: ['3', '291'], lat: 1.3548, lng: 103.9535 },
  { id: 'bs-76161', name: 'Blk 390 Tampines Ave 7', code: '76161', road: 'Tampines Ave 7', lines: ['19', '21', '29', '37', '81'], lat: 1.3582, lng: 103.9576 },
  { id: 'bs-76099', name: 'Opp Tampines JC', code: '76099', road: 'Tampines Ave 9', lines: ['27', '72', '168'], lat: 1.3605, lng: 103.9508 },

  { id: 'bs-53231', name: 'Bishan Stn', code: '53231', road: 'Bishan Rd', lines: ['50', '52', '54', '55', '56', '57', '58', '59', '410'], lat: 1.3512, lng: 103.8492 },
  { id: 'bs-53239', name: 'Opp Bishan Stn', code: '53239', road: 'Bishan Rd', lines: ['52', '54', '55', '58', '410W'], lat: 1.3504, lng: 103.8475 },
  { id: 'bs-53009', name: 'Bishan Int', code: '53009', road: 'Bishan St 13', lines: ['53', '54', '55', '56', '57', '58', '59', '410G'], lat: 1.3496, lng: 103.8498 },
  { id: 'bs-53271', name: 'Blk 169 Bishan St 13', code: '53271', road: 'Bishan St 13', lines: ['54', '410'], lat: 1.3475, lng: 103.8510 },
  { id: 'bs-53389', name: 'Whitley Sec Sch', code: '53389', road: 'Bishan St 24', lines: ['13', '52', '88'], lat: 1.3568, lng: 103.8472 },

  { id: 'bs-84009', name: 'Bedok Int', code: '84009', road: 'Bedok North Dr', lines: ['7', '9', '14', '16', '17', '18', '25', '26', '30', '35', '60', '66', '69', '87', '168'], lat: 1.3245, lng: 103.9312 },
  { id: 'bs-84039', name: 'Bedok Stn Exit A', code: '84039', road: 'New Upper Changi Rd', lines: ['2', '9', '24', '28', '31', '67'], lat: 1.3235, lng: 103.9295 },
  { id: 'bs-84511', name: 'Blk 121 Bedok Reservoir Rd', code: '84511', road: 'Bedok Reservoir Rd', lines: ['8', '15', '21', '22', '65'], lat: 1.3328, lng: 103.9102 },

  { id: 'bs-11149', name: 'Queenstown Stn Exit A', code: '11149', road: 'Commonwealth Ave', lines: ['51', '111', '145', '186', '195', '970'], lat: 1.2942, lng: 103.8055 },
  { id: 'bs-11141', name: 'Queenstown Stn Exit B', code: '11141', road: 'Commonwealth Ave', lines: ['51', '111', '145', '186', '195'], lat: 1.2952, lng: 103.8068 },
  { id: 'bs-10339', name: 'Opp Dawson Place', code: '10339', road: 'Strathmore Ave', lines: ['32', '122'], lat: 1.2942, lng: 103.8090 },

  { id: 'bs-10169', name: 'Opp Blk 1 Cantonment Rd', code: '10169', road: 'Cantonment Rd', lines: ['75', '167', '196'], lat: 1.2778, lng: 103.8410 },
  { id: 'bs-03019', name: 'The Sail', code: '03019', road: 'Marina Blvd', lines: ['10', '70', '97', '100', '130', '196'], lat: 1.2815, lng: 103.8530 },
  { id: 'bs-03059', name: 'One Raffles Quay', code: '03059', road: 'Raffles Quay', lines: ['10', '57', '70', '100', '131', '167', '196'], lat: 1.2825, lng: 103.8522 },
  { id: 'bs-03071', name: 'Marina Bay Financial Ctr', code: '03071', road: 'Marina Way', lines: ['97', '106', '133', '400', '502'], lat: 1.2785, lng: 103.8540 },

  { id: 'bs-17179', name: 'Clementi Stn Exit A', code: '17179', road: 'Commonwealth Ave West', lines: ['14', '52', '96', '105', '106', '147', '154', '165', '166', '175', '196'], lat: 1.3155, lng: 103.7660 },
  { id: 'bs-17181', name: 'Clementi Stn Exit B', code: '17181', road: 'Commonwealth Ave West', lines: ['99', '173', '196', '197', '198', '285'], lat: 1.3148, lng: 103.7645 },
  { id: 'bs-17269', name: 'Regent Pk / Parc Clematis', code: '17269', road: 'Jalan Lempeng', lines: ['201'], lat: 1.3190, lng: 103.7622 },

  { id: 'bs-28009', name: 'Jurong East Int', code: '28009', road: 'Jurong Gateway Rd', lines: ['41', '49', '51', '66', '78', '79', '97', '98', '105', '143', '160', '183', '197'], lat: 1.3340, lng: 103.7420 },
  { id: 'bs-28301', name: 'Opp Blk 506 Jurong West', code: '28301', road: 'Jurong West St 52', lines: ['49', '335'], lat: 1.3495, lng: 103.7185 },

  { id: 'bs-65009', name: 'Punggol Temp Int', code: '65009', road: 'Punggol Pl', lines: ['3', '34', '43', '62', '82', '83', '84', '85', '136', '382', '386'], lat: 1.4048, lng: 103.9015 },
  { id: 'bs-65151', name: 'Blk 268C Punggol Field', code: '65151', road: 'Punggol Field', lines: ['3', '83', '85', '136'], lat: 1.4038, lng: 103.9070 },
  { id: 'bs-65481', name: 'Opp Sumang Stn', code: '65481', road: 'Sumang Walk', lines: ['382G'], lat: 1.4082, lng: 103.8988 }
];

export function getNearbyTransit(propertyLat: number, propertyLng: number) {
  // 1. Calculate and rank MRT/LRT stations
  const mrtsWithDistance = SINGAPORE_MRT_LRT.map((stn, idx) => {
    const dist = calculateDistanceMeters(propertyLat, propertyLng, stn.lat, stn.lng);
    // Walking speed ~ 4.8 km/h = 80 metres per minute
    const walkMin = Math.max(1, Math.round(dist / 80));
    return {
      id: `mrt-${idx}`,
      name: stn.name,
      code: stn.code,
      type: stn.type,
      lines: stn.lines,
      lat: stn.lat,
      lng: stn.lng,
      distanceMeters: dist,
      walkMinutes: walkMin
    };
  })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 3);

  // 2. Calculate and rank Bus Stops
  const busStopsWithDistance = SINGAPORE_BUS_STOPS.map((bs) => {
    const dist = calculateDistanceMeters(propertyLat, propertyLng, bs.lat, bs.lng);
    const walkMin = Math.max(1, Math.round(dist / 80));
    return {
      id: bs.id,
      name: bs.name,
      code: bs.code,
      type: 'BUS' as const,
      road: bs.road,
      lines: bs.lines,
      lat: bs.lat,
      lng: bs.lng,
      distanceMeters: dist,
      walkMinutes: walkMin
    };
  })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 3);

  return {
    mrtStations: mrtsWithDistance,
    busStops: busStopsWithDistance
  };
}
