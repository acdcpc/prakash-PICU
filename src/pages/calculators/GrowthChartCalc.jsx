import { useState } from 'react';
import GrowthChart from '../../components/GrowthChart';
import { adToNepali, nepaliToAd, isValidNepaliDate } from '../../lib/nepaliDate';
import { notifyError } from '../../lib/notifications';

// WHO/CDC Growth Reference Data (LMS parameters: L, M, S)
// Weight-for-age (kg) — Boys 0-20 years (selected ages for interpolation)
const WHO_BOYS_WT = [
  // age_months, L, M, S
  [0, 0.3487, 3.3464, 0.14602],
  [1, 0.2297, 4.4709, 0.13395],
  [2, 0.1970, 5.5675, 0.12385],
  [3, 0.1738, 6.3762, 0.11727],
  [4, 0.1553, 7.0023, 0.11316],
  [5, 0.1395, 7.5105, 0.11080],
  [6, 0.1257, 7.9340, 0.10958],
  [7, 0.1134, 8.2970, 0.10902],
  [8, 0.1021, 8.6151, 0.10882],
  [9, 0.0917, 8.9014, 0.10881],
  [10, 0.0820, 9.1649, 0.10891],
  [11, 0.0730, 9.4122, 0.10906],
  [12, 0.0644, 9.6479, 0.10925],
  [15, 0.0407, 10.3161, 0.10983],
  [18, 0.0189, 10.9499, 0.11049],
  [21, -0.0011, 11.5542, 0.11122],
  [24, -0.0195, 12.1322, 0.11201],
  [30, -0.0517, 13.2228, 0.11381],
  [36, -0.0797, 14.2609, 0.11592],
  [48, -0.1135, 16.2890, 0.12166],
  [60, -0.1725, 18.2739, 0.12934],
  [72, -0.2191, 20.5060, 0.13702],
  [84, -0.2466, 23.1236, 0.14364],
  [96, -0.2584, 26.1075, 0.14876],
  [108, -0.2611, 29.5271, 0.15230],
  [120, -0.2614, 33.6178, 0.15421],
  [132, -0.2628, 38.5220, 0.15470],
  [144, -0.2638, 44.1490, 0.15448],
  [156, -0.2629, 50.1700, 0.15413],
  [168, -0.2604, 56.3003, 0.15392],
  [180, -0.2570, 62.2455, 0.15387],
  [192, -0.2535, 67.5929, 0.15402],
  [204, -0.2503, 71.8579, 0.15439],
  [216, -0.2478, 74.6928, 0.15502],
  [228, -0.2462, 76.2679, 0.15590],
];

const WHO_GIRLS_WT = [
  [0, 0.3809, 3.2322, 0.14171],
  [1, 0.1714, 4.1873, 0.13724],
  [2, 0.0962, 5.1282, 0.13000],
  [3, 0.0402, 5.8458, 0.12619],
  [4, -0.0050, 6.4237, 0.12402],
  [5, -0.0430, 6.8985, 0.12274],
  [6, -0.0756, 7.2970, 0.12204],
  [7, -0.1039, 7.6422, 0.12178],
  [8, -0.1288, 7.9487, 0.12181],
  [9, -0.1507, 8.2254, 0.12199],
  [10, -0.1700, 8.4800, 0.12223],
  [11, -0.1872, 8.7192, 0.12247],
  [12, -0.2024, 8.9481, 0.12268],
  [15, -0.2406, 9.6179, 0.12301],
  [18, -0.2681, 10.2787, 0.12311],
  [21, -0.2868, 10.9386, 0.12324],
  [24, -0.2983, 11.5997, 0.12350],
  [30, -0.3063, 12.9226, 0.12459],
  [36, -0.3032, 14.2566, 0.12629],
  [48, -0.2836, 16.9752, 0.13114],
  [60, -0.2538, 19.9492, 0.13780],
  [72, -0.2321, 23.2710, 0.14470],
  [84, -0.2210, 27.0551, 0.15091],
  [96, -0.2144, 31.2829, 0.15614],
  [108, -0.2079, 35.9595, 0.16032],
  [120, -0.1997, 41.1857, 0.16343],
  [132, -0.1917, 46.7887, 0.16557],
  [144, -0.1859, 52.1520, 0.16706],
  [156, -0.1818, 56.6558, 0.16817],
  [168, -0.1779, 59.9228, 0.16915],
  [180, -0.1724, 61.8791, 0.17020],
  [192, -0.1646, 62.7047, 0.17144],
  [204, -0.1560, 62.8008, 0.17290],
  [216, -0.1494, 62.4588, 0.17453],
  [228, -0.1465, 61.7790, 0.17631],
];

// Height-for-age (cm) — Boys
const WHO_BOYS_HT = [
  [0, 1, 49.8842, 0.03795],
  [1, 1, 54.7244, 0.03557],
  [2, 1, 58.4249, 0.03424],
  [3, 1, 61.4292, 0.03328],
  [4, 1, 63.8860, 0.03257],
  [5, 1, 65.9026, 0.03204],
  [6, 1, 67.6236, 0.03165],
  [7, 1, 69.1645, 0.03139],
  [8, 1, 70.5902, 0.03124],
  [9, 1, 71.9388, 0.03117],
  [10, 1, 73.2365, 0.03118],
  [11, 1, 74.4992, 0.03125],
  [12, 1, 75.7399, 0.03137],
  [15, 1, 79.2462, 0.03185],
  [18, 1, 82.4687, 0.03249],
  [21, 1, 85.4475, 0.03324],
  [24, 1, 87.8161, 0.03368],
  [30, 1, 92.1320, 0.03449],
  [36, 1, 96.1215, 0.03538],
  [48, 1, 103.3677, 0.03724],
  [60, 1, 110.0807, 0.03926],
  [72, 1, 116.5538, 0.04115],
  [84, 1, 122.9292, 0.04312],
  [96, 1, 129.1244, 0.04498],
  [108, 1, 135.0722, 0.04649],
  [120, 1, 140.7504, 0.04737],
  [132, 1, 146.3338, 0.04748],
  [144, 1, 151.6985, 0.04699],
  [156, 1, 156.8500, 0.04617],
  [168, 1, 161.6353, 0.04531],
  [180, 1, 165.5539, 0.04455],
  [192, 1, 168.3284, 0.04392],
  [204, 1, 170.3047, 0.04337],
  [216, 1, 172.3117, 0.04283],
  [228, 1, 174.9894, 0.04224],
];

const WHO_GIRLS_HT = [
  [0, 1, 49.1477, 0.03790],
  [1, 1, 53.6872, 0.03624],
  [2, 1, 57.0673, 0.03519],
  [3, 1, 59.8029, 0.03428],
  [4, 1, 62.0899, 0.03357],
  [5, 1, 64.0301, 0.03304],
  [6, 1, 65.7311, 0.03264],
  [7, 1, 67.2873, 0.03237],
  [8, 1, 68.7498, 0.03220],
  [9, 1, 70.1435, 0.03211],
  [10, 1, 71.4864, 0.03208],
  [11, 1, 72.7910, 0.03209],
  [12, 1, 74.0673, 0.03213],
  [15, 1, 77.6909, 0.03235],
  [18, 1, 80.9965, 0.03274],
  [21, 1, 84.0211, 0.03323],
  [24, 1, 86.4522, 0.03357],
  [30, 1, 90.8604, 0.03419],
  [36, 1, 94.9816, 0.03499],
  [48, 1, 102.5279, 0.03697],
  [60, 1, 109.6102, 0.03930],
  [72, 1, 116.4304, 0.04178],
  [84, 1, 123.1419, 0.04438],
  [96, 1, 129.7997, 0.04693],
  [108, 1, 136.3542, 0.04915],
  [120, 1, 142.6241, 0.05064],
  [132, 1, 148.4258, 0.05110],
  [144, 1, 153.4228, 0.05062],
  [156, 1, 157.4015, 0.04962],
  [168, 1, 160.5646, 0.04845],
  [180, 1, 163.1701, 0.04730],
  [192, 1, 165.2525, 0.04626],
  [204, 1, 166.8974, 0.04533],
  [216, 1, 168.2299, 0.04450],
  [228, 1, 169.4385, 0.04378],
];

// Head circumference (cm) — Boys 0-60 months
const WHO_BOYS_HC = [
  [0, 1, 34.4618, 0.03686],
  [1, 1, 37.2759, 0.03133],
  [2, 1, 39.1285, 0.02997],
  [3, 1, 40.5135, 0.02918],
  [4, 1, 41.5855, 0.02866],
  [5, 1, 42.4598, 0.02831],
  [6, 1, 43.1993, 0.02807],
  [7, 1, 43.8381, 0.02791],
  [8, 1, 44.3995, 0.02781],
  [9, 1, 44.8993, 0.02776],
  [10, 1, 45.3493, 0.02773],
  [11, 1, 45.7581, 0.02773],
  [12, 1, 46.1327, 0.02775],
  [15, 1, 47.0711, 0.02785],
  [18, 1, 47.8152, 0.02801],
  [21, 1, 48.4180, 0.02822],
  [24, 1, 48.8995, 0.02846],
  [30, 1, 49.6741, 0.02898],
  [36, 1, 50.2693, 0.02948],
  [48, 1, 51.1418, 0.03031],
  [60, 1, 51.7907, 0.03095],
];

const WHO_GIRLS_HC = [
  [0, 1, 33.8787, 0.03496],
  [1, 1, 36.5463, 0.03210],
  [2, 1, 38.2521, 0.03100],
  [3, 1, 39.5328, 0.03032],
  [4, 1, 40.5817, 0.02985],
  [5, 1, 41.4590, 0.02951],
  [6, 1, 42.2095, 0.02926],
  [7, 1, 42.8691, 0.02908],
  [8, 1, 43.4585, 0.02894],
  [9, 1, 43.9922, 0.02883],
  [10, 1, 44.4806, 0.02875],
  [11, 1, 44.9310, 0.02868],
  [12, 1, 45.3492, 0.02863],
  [15, 1, 46.4167, 0.02854],
  [18, 1, 47.2447, 0.02853],
  [21, 1, 47.8856, 0.02860],
  [24, 1, 48.3740, 0.02872],
  [30, 1, 49.1080, 0.02906],
  [36, 1, 49.6665, 0.02947],
  [48, 1, 50.5095, 0.03035],
  [60, 1, 51.1524, 0.03113],
];

function interpolateLMS(data, ageMonths) {
  if (ageMonths <= data[0][0]) return data[0];
  if (ageMonths >= data[data.length - 1][0]) return data[data.length - 1];
  for (let i = 0; i < data.length - 1; i++) {
    if (ageMonths >= data[i][0] && ageMonths <= data[i + 1][0]) {
      const frac = (ageMonths - data[i][0]) / (data[i + 1][0] - data[i][0]);
      return [
        ageMonths,
        data[i][1] + frac * (data[i + 1][1] - data[i][1]),
        data[i][2] + frac * (data[i + 1][2] - data[i][2]),
        data[i][3] + frac * (data[i + 1][3] - data[i][3]),
      ];
    }
  }
  return data[data.length - 1];
}

function zScoreToPercentile(z) {
  // Convert z-score to percentile using normal distribution approximation
  if (z < -3) return 0.1;
  if (z > 3) return 99.9;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return Math.round((z > 0 ? p : 1 - p) * 1000) / 10;
}

function calcPercentile(measurement, ref) {
  // LMS method: Z = ((X/M)^L - 1) / (L * S)  if L != 0
  const [_, L, M, S] = ref;
  let z;
  if (Math.abs(L) < 0.0001) {
    z = Math.log(measurement / M) / S;
  } else {
    z = (Math.pow(measurement / M, L) - 1) / (L * S);
  }
  // Cap extreme z-scores
  z = Math.max(-5, Math.min(5, z));
  const percentile = zScoreToPercentile(z);
  let category;
  if (z < -3) category = 'Severely Under (<0.1%)';
  else if (z < -2) category = 'Underweight/Stunted (<3%)';
  else if (z < -1) category = 'Low Normal (3-15%)';
  else if (z <= 1) category = 'Normal (15-85%)';
  else if (z <= 2) category = 'High Normal (85-97%)';
  else if (z <= 3) category = 'Overweight/Tall (>97%)';
  else category = 'Severely High (>99.9%)';
  return { z: +z.toFixed(2), percentile, category };
}

export default function GrowthChartCalc() {
  const [dob, setDob] = useState('');
  const [dobNepali, setDobNepali] = useState('');
  const [dateMode, setDateMode] = useState('ad');
  const [sex, setSex] = useState('boy');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [headCirc, setHeadCirc] = useState('');
  const [result, setResult] = useState(null);

  function ageInMonths(dobStr) {
    const birth = new Date(dobStr);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return Math.max(0, months);
  }

  function handleCalc(e) {
    e.preventDefault();
    const resolvedDob = dateMode === 'bs' ? nepaliToAd(dobNepali) : dob;
    if (!resolvedDob) { notifyError(dateMode === 'bs' && !isValidNepaliDate(dobNepali) ? 'Enter a valid Nepali date in YYYY-MM-DD format.' : 'Please enter date of birth.'); return; }
    const ageMo = ageInMonths(resolvedDob);
    const results = [];
    const isBoy = sex === 'boy';
    const wtData = isBoy ? WHO_BOYS_WT : WHO_GIRLS_WT;
    const htData = isBoy ? WHO_BOYS_HT : WHO_GIRLS_HT;
    const hcData = isBoy ? WHO_BOYS_HC : WHO_GIRLS_HC;

    if (weight && ageMo <= 228) {
      const ref = interpolateLMS(wtData, ageMo);
      const r = calcPercentile(parseFloat(weight), ref);
      results.push({ label: 'Weight-for-Age', value: weight + ' kg', ...r });
    }
    if (height && ageMo <= 228) {
      const ref = interpolateLMS(htData, ageMo);
      const r = calcPercentile(parseFloat(height), ref);
      results.push({ label: 'Height-for-Age', value: height + ' cm', ...r });
    }
    if (headCirc && ageMo <= 60) {
      const ref = interpolateLMS(hcData, Math.min(ageMo, 60));
      const r = calcPercentile(parseFloat(headCirc), ref);
      results.push({ label: 'Head Circumference', value: headCirc + ' cm', ...r });
    }

    // BMI calculation if both weight and height provided
    if (weight && height && ageMo >= 24) {
      const hM = parseFloat(height) / 100;
      const bmi = parseFloat(weight) / (hM * hM);
      // Approximate BMI-for-age using weight and height z-scores combined
      const wtRef = interpolateLMS(wtData, ageMo);
      const htRef = interpolateLMS(htData, ageMo);
      let wtZ, htZ;
      if (Math.abs(wtRef[1]) < 0.0001) wtZ = Math.log(parseFloat(weight) / wtRef[2]) / wtRef[3];
      else wtZ = (Math.pow(parseFloat(weight) / wtRef[2], wtRef[1]) - 1) / (wtRef[1] * wtRef[3]);
      if (Math.abs(htRef[1]) < 0.0001) htZ = Math.log(parseFloat(height) / htRef[2]) / htRef[3];
      else htZ = (Math.pow(parseFloat(height) / htRef[2], htRef[1]) - 1) / (htRef[1] * htRef[3]);
      const bmiZ = (wtZ - 0.7 * htZ) / 0.72; // rough BMI-for-age proxy
      const bmiPct = zScoreToPercentile(Math.max(-5, Math.min(5, bmiZ)));
      let bmiCat;
      if (bmiZ < -2) bmiCat = 'Underweight (<3%)';
      else if (bmiZ < 1) bmiCat = 'Healthy Weight (3-85%)';
      else if (bmiZ < 2) bmiCat = 'Overweight (85-97%)';
      else bmiCat = 'Obese (>97%)';
      results.push({ label: 'BMI-for-Age', value: bmi.toFixed(1) + ' kg/m²', z: +bmiZ.toFixed(2), percentile: bmiPct, category: bmiCat });
    }

    setResult({
      ageMonths: ageMo,
      ageDisplay: ageMo < 24
        ? `${ageMo} months`
        : `${Math.floor(ageMo / 12)} years ${ageMo % 12} months`,
      results,
    });
  }

  const catColor = (cat) => {
    if (cat.includes('Under') || cat.includes('Stunted')) return 'bg-red';
    if (cat.includes('Low')) return 'bg-amber';
    if (cat.includes('Normal') || cat.includes('Healthy')) return 'bg-green';
    if (cat.includes('High') || cat.includes('Overweight')) return 'bg-amber';
    if (cat.includes('Severe') || cat.includes('Obese')) return 'bg-red';
    return 'bg-blue';
  };

  return (
    <div>
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-head"><h4>Growth Chart — WHO/CDC Reference</h4></div>
        <div className="card-body">
          <form onSubmit={handleCalc}>
            <div className="form-group">
              <div className="date-mode-tabs"><button type="button" className={dateMode === 'ad' ? 'active' : ''} onClick={() => setDateMode('ad')}>AD / Gregorian</button><button type="button" className={dateMode === 'bs' ? 'active' : ''} onClick={() => setDateMode('bs')}>BS / Nepali</button></div>
              <label className="form-label">Date of Birth *</label>
              {dateMode === 'ad' ? <input className="form-input" type="date" value={dob} onChange={e => setDob(e.target.value)} required /> : <input className="form-input" type="text" value={dobNepali} onChange={e => setDobNepali(e.target.value)} placeholder="YYYY-MM-DD · e.g. 2080-04-12" required />}
              <p className="text-sm text-muted mt-1">{dateMode === 'ad' ? `Nepali date: ${adToNepali(dob) || '—'}` : `Converted AD date: ${nepaliToAd(dobNepali) || '—'}`}</p>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Sex</label>
                <select className="form-select" value={sex} onChange={e => setSex(e.target.value)}>
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input className="form-input" type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 12.5" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Height/Length (cm)</label>
                <input className="form-input" type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 85.0" />
              </div>
              <div className="form-group">
                <label className="form-label">Head Circumference (cm)</label>
                <input className="form-input" type="number" step="0.1" value={headCirc} onChange={e => setHeadCirc(e.target.value)} placeholder="0-60 months only" />
              </div>
            </div>
            <p className="text-sm text-muted mb-3">
              Enter date of birth and at least one measurement. Head circumference applies to children 0-60 months. BMI applies to children 2+ years.
            </p>
            <button type="submit" className="btn btn-teal btn-block">Calculate Growth Percentiles</button>
          </form>
        </div>
      </div>

      {result && (
        <div className="card mt-3">
          <div className="card-head">
            <h4>Growth Assessment</h4>
            <span className="text-sm text-muted">
              Age: {result.ageDisplay} | Sex: {sex === 'boy' ? 'Boy' : 'Girl'}
            </span>
          </div>
          <div className="card-body">
            {result.results.length === 0 ? (
              <p className="text-muted">Enter at least one measurement to see percentiles.</p>
            ) : (
              <div>
                <GrowthChart results={result.results} />
                {result.results.map((r, i) => (
                  <div key={i} className="rbox mb-3" style={{ borderLeft: `4px solid ${r.category.includes('Normal') || r.category.includes('Healthy') ? 'var(--green)' : r.category.includes('Low') || r.category.includes('High') || r.category.includes('Overweight') ? 'var(--amber)' : 'var(--red)'}` }}>
                    <div className="flex jc-between items-c mb-2">
                      <strong>{r.label}</strong>
                      <span className={`badge ${catColor(r.category)}`}>{r.percentile}th percentile</span>
                    </div>
                    <div className="flex jc-between items-c text-sm">
                      <span className="text-muted">Measured: {r.value}</span>
                      <span className="text-muted">Z-score: {r.z}</span>
                    </div>
                    <div className="text-sm mt-1" style={{ color: catColor(r.category) === 'bg-green' ? 'var(--green)' : catColor(r.category) === 'bg-amber' ? 'var(--amber)' : 'var(--red)' }}>
                      {r.category}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
