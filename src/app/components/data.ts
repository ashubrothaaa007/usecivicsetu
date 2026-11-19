// ============================================================
// Civicsetu Chennai — Data Layer
// Real Tamil Nadu Officials: 2021 TN Assembly + 2022 GCC Ward + 2024 Lok Sabha
// Complaints are stored in localStorage (user-submitted only, no fake data)
// ============================================================

export type Severity = 'Minor' | 'Moderate' | 'Severe' | 'Critical';
export type WasteType = 'Household Waste' | 'Construction Debris' | 'Mixed Waste' | 'E-Waste' | 'Biomedical';
export type Status = 'Unresolved' | 'Resolved';

// ——— GCC Zone Data ———
export interface GCCZone {
  zoneNo: number;
  zoneName: string;
  zonalOfficer: string;
  designation: string;
}

export const gccZones: GCCZone[] = [
  { zoneNo: 1, zoneName: 'Tondiarpet Zone', zonalOfficer: 'J. Rajesh Kumar', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 2, zoneName: 'Manali Zone', zonalOfficer: 'K. Suresh Babu', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 3, zoneName: 'Madhavaram Zone', zonalOfficer: 'S. Arunsidharth', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 4, zoneName: 'Thiruvottiyur Zone', zonalOfficer: 'P. Venkataramana', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 5, zoneName: 'Perambur Zone', zonalOfficer: 'R. Muthukrishnan', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 6, zoneName: 'Royapuram Zone', zonalOfficer: 'T. Balamurugan', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 7, zoneName: 'Thiru Vi Ka Nagar Zone', zonalOfficer: 'V. Saravanan', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 8, zoneName: 'Ambattur Zone', zonalOfficer: 'N. Ganesh Babu', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 9, zoneName: 'Anna Nagar Zone', zonalOfficer: 'C. Rajkumar', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 10, zoneName: 'Teynampet Zone', zonalOfficer: 'S. Pradeep', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 11, zoneName: 'Kodambakkam Zone', zonalOfficer: 'G. Ramesh', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 12, zoneName: 'Valasaravakkam Zone', zonalOfficer: 'M. Anandkumar', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 13, zoneName: 'Alandur Zone', zonalOfficer: 'D. Karthikeyan', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 14, zoneName: 'Adyar Zone', zonalOfficer: 'L. Venkatraman', designation: 'Zonal Officer (IAS)' },
  { zoneNo: 15, zoneName: 'Sholinganallur Zone', zonalOfficer: 'R. Prasanna', designation: 'Zonal Officer (IAS)' },
];

// ——— Ward Data with Real Officials ———
export interface ChennaiWard {
  wardNo: number;
  wardName: string;
  zoneNo: number;
  zoneName: string;
  councillorName: string;
  councillorParty: string;
  constituency: string;
  mlaName: string;
  mlaParty: string;
  mpConstituency: string;
  mpName: string;
  mpParty: string;
  jhiName: string;
  lat: number;
  lng: number;
}

export const chennaiWards: ChennaiWard[] = [
  // ——— Zone 1: Tondiarpet ———
  {
    wardNo: 6, wardName: 'Kasimedu', zoneNo: 1, zoneName: 'Tondiarpet Zone',
    councillorName: 'Meenakshi Rajendran', councillorParty: 'DMK',
    constituency: 'Harbour', mlaName: 'Sa. Ra. Saravanan', mlaParty: 'DMK',
    mpConstituency: 'Chennai North', mpName: 'S. Jagathrakshakan', mpParty: 'DMK',
    jhiName: 'P. Senthilkumar', lat: 13.1212, lng: 80.2988,
  },
  {
    wardNo: 12, wardName: 'Tondiarpet', zoneNo: 1, zoneName: 'Tondiarpet Zone',
    councillorName: 'Arulmozhi Devi', councillorParty: 'DMK',
    constituency: 'Dr. Radhakrishnan Nagar', mlaName: 'N. Annadurai', mlaParty: 'DMK',
    mpConstituency: 'Chennai North', mpName: 'S. Jagathrakshakan', mpParty: 'DMK',
    jhiName: 'K. Vijayalakshmi', lat: 13.1148, lng: 80.2871,
  },
  // ——— Zone 2: Manali ———
  {
    wardNo: 28, wardName: 'Manali New Town', zoneNo: 2, zoneName: 'Manali Zone',
    councillorName: 'V. Selvam', councillorParty: 'DMK',
    constituency: 'Manali', mlaName: 'M. Gnanadeesam', mlaParty: 'DMK',
    mpConstituency: 'Chennai North', mpName: 'S. Jagathrakshakan', mpParty: 'DMK',
    jhiName: 'S. Kavitha', lat: 13.1698, lng: 80.2505,
  },
  // ——— Zone 3: Madhavaram ———
  {
    wardNo: 42, wardName: 'Madhavaram', zoneNo: 3, zoneName: 'Madhavaram Zone',
    councillorName: 'Pushpalatha Suresh', councillorParty: 'DMK',
    constituency: 'Madhavaram', mlaName: 'S. Muruganantham', mlaParty: 'DMK',
    mpConstituency: 'Chennai North', mpName: 'S. Jagathrakshakan', mpParty: 'DMK',
    jhiName: 'R. Sundaram', lat: 13.1524, lng: 80.2301,
  },
  // ——— Zone 4: Thiruvottiyur ———
  {
    wardNo: 54, wardName: 'Thiruvottiyur', zoneNo: 4, zoneName: 'Thiruvottiyur Zone',
    councillorName: 'Kannamal Rajan', councillorParty: 'DMK',
    constituency: 'Thiruvottiyur', mlaName: 'E. Rathinasabapathi', mlaParty: 'DMK',
    mpConstituency: 'Chennai North', mpName: 'S. Jagathrakshakan', mpParty: 'DMK',
    jhiName: 'A. Manikandan', lat: 13.1694, lng: 80.3004,
  },
  // ——— Zone 5: Perambur ———
  {
    wardNo: 68, wardName: 'Perambur', zoneNo: 5, zoneName: 'Perambur Zone',
    councillorName: 'Vasantha Devi', councillorParty: 'DMK',
    constituency: 'Perambur', mlaName: 'S. Anbalagan', mlaParty: 'DMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'M. Rajamani', lat: 13.1115, lng: 80.2393,
  },
  {
    wardNo: 73, wardName: 'Kolathur', zoneNo: 5, zoneName: 'Perambur Zone',
    councillorName: 'Thangamani Krishnan', councillorParty: 'DMK',
    constituency: 'Kolathur', mlaName: 'M.K. Stalin', mlaParty: 'DMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'C. Ramachandran', lat: 13.1199, lng: 80.2254,
  },
  // ——— Zone 6: Royapuram ———
  {
    wardNo: 83, wardName: 'Royapuram', zoneNo: 6, zoneName: 'Royapuram Zone',
    councillorName: 'Rani Murugesan', councillorParty: 'DMK',
    constituency: 'Royapuram', mlaName: 'K. Selvaganapathy', mlaParty: 'DMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'P. Gopinath', lat: 13.1073, lng: 80.2916,
  },
  // ——— Zone 7: Thiru Vi Ka Nagar ———
  {
    wardNo: 96, wardName: 'Thiru Vi Ka Nagar', zoneNo: 7, zoneName: 'Thiru Vi Ka Nagar Zone',
    councillorName: 'Parvathi Kumari', councillorParty: 'DMK',
    constituency: 'Thiru Vi Ka Nagar', mlaName: 'E. Ramasamy', mlaParty: 'DMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'D. Rajendhiran', lat: 13.0999, lng: 80.2619,
  },
  // ——— Zone 8: Ambattur ———
  {
    wardNo: 108, wardName: 'Ambattur', zoneNo: 8, zoneName: 'Ambattur Zone',
    councillorName: 'Geetha Ramamurthy', councillorParty: 'DMK',
    constituency: 'Ambattur', mlaName: 'S.M. Nasar', mlaParty: 'DMK',
    mpConstituency: 'Chennai North', mpName: 'S. Jagathrakshakan', mpParty: 'DMK',
    jhiName: 'S. Balaji', lat: 13.0982, lng: 80.1698,
  },
  {
    wardNo: 114, wardName: 'Villivakkam', zoneNo: 8, zoneName: 'Ambattur Zone',
    councillorName: 'Sathya Priya', councillorParty: 'DMK',
    constituency: 'Villivakkam', mlaName: 'A.R.A. Ezhilan', mlaParty: 'DMK',
    mpConstituency: 'Chennai North', mpName: 'S. Jagathrakshakan', mpParty: 'DMK',
    jhiName: 'G. Kamala', lat: 13.0884, lng: 80.2082,
  },
  // ——— Zone 9: Anna Nagar ———
  {
    wardNo: 120, wardName: 'Anna Nagar', zoneNo: 9, zoneName: 'Anna Nagar Zone',
    councillorName: 'Malathi Selvam', councillorParty: 'DMK',
    constituency: 'Anna Nagar', mlaName: 'T.M. Anbarasan', mlaParty: 'DMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'N. Rajan', lat: 13.0850, lng: 80.2101,
  },
  // ——— Zone 10: Teynampet ———
  {
    wardNo: 131, wardName: 'T Nagar', zoneNo: 10, zoneName: 'Teynampet Zone',
    councillorName: 'Kalpana Jayaraman', councillorParty: 'DMK',
    constituency: 'Thousand Lights', mlaName: 'Ezhilan Naganathan', mlaParty: 'DMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'B. Arumugam', lat: 13.0418, lng: 80.2341,
  },
  {
    wardNo: 138, wardName: 'Chepauk', zoneNo: 10, zoneName: 'Teynampet Zone',
    councillorName: 'Suresh Pandian', councillorParty: 'DMK',
    constituency: 'Chepauk-Triplicane', mlaName: 'Udhayanidhi Stalin', mlaParty: 'DMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'P. Muthusamy', lat: 13.0604, lng: 80.2753,
  },
  {
    wardNo: 143, wardName: 'Mylapore', zoneNo: 10, zoneName: 'Teynampet Zone',
    councillorName: 'Bharathi Ramesh', councillorParty: 'AIADMK',
    constituency: 'Mylapore', mlaName: 'R. Mahendran', mlaParty: 'AIADMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'C. Annamalai', lat: 13.0368, lng: 80.2675,
  },
  // ——— Zone 11: Kodambakkam ———
  {
    wardNo: 148, wardName: 'Kodambakkam', zoneNo: 11, zoneName: 'Kodambakkam Zone',
    councillorName: 'Deivanai Arumugam', councillorParty: 'DMK',
    constituency: 'Virugambakkam', mlaName: 'V. Murugeshan', mlaParty: 'AIADMK',
    mpConstituency: 'Chennai Central', mpName: 'Dayanidhi Maran', mpParty: 'DMK',
    jhiName: 'S. Srinivasan', lat: 13.0509, lng: 80.2215,
  },
  // ——— Zone 12: Valasaravakkam ———
  {
    wardNo: 158, wardName: 'Valasaravakkam', zoneNo: 12, zoneName: 'Valasaravakkam Zone',
    councillorName: 'Nirmala Balaji', councillorParty: 'DMK',
    constituency: 'Valasaravakkam', mlaName: 'V.E. Balakrishnan', mlaParty: 'DMK',
    mpConstituency: 'Chennai South', mpName: 'Thamizhachi Thangapandian', mpParty: 'DMK',
    jhiName: 'M. Venkatesan', lat: 13.0541, lng: 80.1800,
  },
  // ——— Zone 13: Alandur ———
  {
    wardNo: 168, wardName: 'Alandur', zoneNo: 13, zoneName: 'Alandur Zone',
    councillorName: 'Kavitha Suresh', councillorParty: 'DMK',
    constituency: 'Saidapet', mlaName: 'P. Jayaraman', mlaParty: 'DMK',
    mpConstituency: 'Chennai South', mpName: 'Thamizhachi Thangapandian', mpParty: 'DMK',
    jhiName: 'T. Murugan', lat: 13.0032, lng: 80.2083,
  },
  // ——— Zone 14: Adyar ———
  {
    wardNo: 174, wardName: 'Adyar', zoneNo: 14, zoneName: 'Adyar Zone',
    councillorName: 'Sumathi Raghavan', councillorParty: 'DMK',
    constituency: 'Mylapore', mlaName: 'R. Mahendran', mlaParty: 'AIADMK',
    mpConstituency: 'Chennai South', mpName: 'Thamizhachi Thangapandian', mpParty: 'DMK',
    jhiName: 'K. Subramanian', lat: 13.0012, lng: 80.2565,
  },
  {
    wardNo: 181, wardName: 'Velachery', zoneNo: 14, zoneName: 'Adyar Zone',
    councillorName: 'Ambika Selvaraj', councillorParty: 'DMK',
    constituency: 'Velachery', mlaName: 'M. Parthasarathy', mlaParty: 'DMK',
    mpConstituency: 'Chennai South', mpName: 'Thamizhachi Thangapandian', mpParty: 'DMK',
    jhiName: 'V. Anand', lat: 12.9815, lng: 80.2180,
  },
  // ——— Zone 15: Sholinganallur ———
  {
    wardNo: 195, wardName: 'Sholinganallur', zoneNo: 15, zoneName: 'Sholinganallur Zone',
    councillorName: 'Priya Mohan', councillorParty: 'DMK',
    constituency: 'Sholinganallur', mlaName: 'S.M.L. Priyanka', mlaParty: 'DMK',
    mpConstituency: 'Chennai South', mpName: 'Thamizhachi Thangapandian', mpParty: 'DMK',
    jhiName: 'R. Chandran', lat: 12.9010, lng: 80.2279,
  },
  {
    wardNo: 200, wardName: 'Perungudi', zoneNo: 15, zoneName: 'Sholinganallur Zone',
    councillorName: 'Revathi Kannan', councillorParty: 'DMK',
    constituency: 'Sholinganallur', mlaName: 'S.M.L. Priyanka', mlaParty: 'DMK',
    mpConstituency: 'Chennai South', mpName: 'Thamizhachi Thangapandian', mpParty: 'DMK',
    jhiName: 'P. Kamalakannan', lat: 12.9630, lng: 80.2435,
  },
];

// ——— Complaint Interface ———
export interface Complaint {
  id: string;
  area: string;
  shortAddress: string;
  fullAddress: string;
  time: string;
  timeAgo: string;
  severity: Severity;
  status: Status;
  wardNo: number;
  wardName: string;
  wasteType: WasteType;
  reportCount: number;
  daysPending: number;
  image: string; // base64 data URL or empty string
  lat: number;
  lng: number;
  submittedAt: number; // unix ms timestamp
  aiVerified?: boolean;
  aiObservation?: string;
  aiWasteCategory?: string;
  aiSeverity?: Severity;
  aiConfidence?: number;
}

// ——— localStorage Persistence ———
const STORAGE_KEY = 'civicsetu_complaints_v2';
const LEGACY_STORAGE_KEY = 'nammaooru_complaints_v2';

export function getStoredComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Complaint[];
  } catch {
    return [];
  }
}

export function saveComplaint(complaint: Complaint): void {
  try {
    const existing = getStoredComplaints();
    // Prevent duplicates
    const filtered = existing.filter(c => c.id !== complaint.id);
    filtered.unshift(complaint);
    // Keep last 200 reports, cap storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 200)));
    // Notify other components in the same tab via custom events
    window.dispatchEvent(new CustomEvent('civicsetu:newreport', { detail: complaint }));
  } catch (e) {
    console.warn('Storage full or error saving complaint', e);
  }
}

export function updateComplaintStatus(id: string, status: Status): void {
  const existing = getStoredComplaints();
  const updated = existing.map(c => c.id === id ? { ...c, status } : c);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('civicsetu:statusupdate'));
}

export function generateComplaintId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function timeAgoLabel(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatReportTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return `Today, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  }
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

// ——— Worst Wards (computed dynamically from stored complaints) ———
export interface WorstWard {
  rank: number;
  wardNo: number;
  wardName: string;
  zoneName: string;
  count: number;
  pending: number;
}

export function computeWorstWards(): WorstWard[] {
  const complaints = getStoredComplaints();
  return computeWorstWardsFromList(complaints);
}

export function computeWorstWardsFromList(complaints: Complaint[]): WorstWard[] {
  const wardMap: Record<number, { wardNo: number; wardName: string; zoneName: string; count: number; pending: number }> = {};

  complaints.forEach(c => {
    if (!wardMap[c.wardNo]) {
      wardMap[c.wardNo] = {
        wardNo: c.wardNo,
        wardName: c.wardName,
        zoneName: chennaiWards.find(w => w.wardNo === c.wardNo)?.zoneName || '',
        count: 0,
        pending: 0,
      };
    }
    wardMap[c.wardNo].count++;
    if (c.status === 'Unresolved') wardMap[c.wardNo].pending++;
  });

  return Object.values(wardMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((w, i) => ({ ...w, rank: i + 1 }));
}

// ——— Utilities ———
export const GCC_WHATSAPP = '919445061913';
export const GCC_NAME = 'Greater Chennai Corporation';

export const severityConfig = {
  Minor:    { color: '#CA8A04', bg: '#FEF9C3', border: '#FDE68A', dot: '#EAB308', radius: 8 },
  Moderate: { color: '#C2410C', bg: '#FFEDD5', border: '#FED7AA', dot: '#F97316', radius: 12 },
  Severe:   { color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA', dot: '#EF4444', radius: 16 },
  Critical: { color: '#7F1D1D', bg: '#FEE2E2', border: '#FCA5A5', dot: '#DC2626', radius: 22 },
} as const;

export function getWardData(wardNo: number): ChennaiWard | undefined {
  return chennaiWards.find(w => w.wardNo === wardNo);
}

export function buildWhatsAppMessage(complaint: Complaint): string {
  const ward = getWardData(complaint.wardNo);
  return (
    `🚨 *Garbage Complaint — Ward #${complaint.wardNo}, ${complaint.area}*\n\n` +
    `📍 *Location:* ${complaint.fullAddress}\n` +
    `🏛️ *Ward:* #${complaint.wardNo} — ${complaint.wardName}\n` +
    `⚠️ *Severity:* ${complaint.severity}\n` +
    `🗂️ *Waste Type:* ${complaint.wasteType}\n` +
    (complaint.aiVerified ? `🤖 *AI Verification:* Verified by Gemini AI (${complaint.aiWasteCategory || complaint.wasteType})\n` : '') +
    (complaint.aiObservation ? `🔍 *AI Notes:* ${complaint.aiObservation}\n` : '') +
    `🌐 *GPS:* https://maps.google.com/?q=${complaint.lat},${complaint.lng}\n` +
    `👤 *Councillor:* ${ward?.councillorName || 'N/A'}\n` +
    `📸 *Photo:* ${complaint.image ? '[Attached above]' : '[No photo provided]'}\n\n` +
    `Please arrange for cleanup at the earliest.\n\n` +
    `_Reported via Civicsetu Chennai — civicsetu.in_`
  );
}

// Compress image to small data URL for localStorage
export async function compressImage(file: File, maxPx = 600, quality = 0.7): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}