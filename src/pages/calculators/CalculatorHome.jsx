import React, { useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ISLCalc from './ISLCalc';
import DrugCalc from './DrugCalc';
import VentCalc from './VentCalc';
import PELODCalc from './PELODCalc';
import RAICalc from './RAICalc';
import NutritionCalc from './NutritionCalc';
import PALSCalc from './PALSCalc';
import PRISMCalc from './PRISMCalc';
import PhoenixCalc from './PhoenixCalc';
import GrowthChartCalc from './GrowthChartCalc';

const CALCULATORS = [
  { key: 'isl', title: 'ISL Calculator', desc: 'Insensible Fluid Loss & Fluid Overload assessment for PICU patients.', color: 'bg-blue', Component: ISLCalc },
  { key: 'drug', title: 'Teddy Bear Drug Dose Calculator', desc: 'Weight-based starter references plus the complete authorized monograph index.', color: 'bg-teal', Component: DrugCalc },
  { key: 'vent', title: 'Ventilator Settings', desc: 'Initial vent settings, ETT sizing, and equipment guide by age.', color: 'bg-navy', Component: VentCalc },
  { key: 'pelod', title: 'PELOD-2 Score', desc: 'Pediatric Logistic Organ Dysfunction mortality prediction.', color: 'bg-red', Component: PELODCalc },
  { key: 'rai', title: 'Renal Angina Index', desc: 'RAI score and AKI risk stratification.', color: 'bg-amber', Component: RAICalc },
  { key: 'nutrition', title: 'Nutrition (Schofield)', desc: 'BMR, protein, fluid, and feeding rates for critically ill children.', color: 'bg-green', Component: NutritionCalc },
  { key: 'pals', title: 'PALS Emergency', desc: 'Emergency drug doses, equipment sizes, and weight estimation.', color: 'bg-red', Component: PALSCalc },
  { key: 'prism', title: 'PRISM-IV', desc: 'Pediatric Risk of Mortality score with detailed multi-system inputs.', color: 'bg-navy', Component: PRISMCalc },
  { key: 'phoenix', title: 'Phoenix Sepsis Score', desc: '2024 Phoenix Sepsis Criteria — sepsis & septic shock identification.', color: 'bg-teal', Component: PhoenixCalc },
  { key: 'growth', title: 'Growth Chart', desc: 'WHO/CDC growth percentiles — weight, height, head circumference by age & sex.', color: 'bg-green', Component: GrowthChartCalc },
];

export default function CalculatorHome() {
  const { user, profile } = useAuth();
  const [activeCalc, setActiveCalc] = useState(null);

  if (activeCalc) {
    const calc = CALCULATORS.find(c => c.key === activeCalc);
    const CalcComponent = calc?.Component;
    return (
      <div>
        <button className="btn btn-ghost mb-3" onClick={() => setActiveCalc(null)}>
          ← Back to Calculators
        </button>
        <h2 className="mb-3">{calc?.title}</h2>
        {CalcComponent && <CalcComponent />}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3">Drugs & Scores</h1>
      <p className="text-muted mb-4">Pediatric reference tools for dosing, assessment, emergency care, and growth follow-up.</p>
      <div className="stats-grid">
        {CALCULATORS.map(calc => (
          <div key={calc.key} className="stat-card card">
            <div className="card-body">
              <div className={`badge ${calc.color} mb-2`}>{calc.title}</div>
              <p className="mb-3" style={{ fontSize: '0.9rem' }}>{calc.desc}</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setActiveCalc(calc.key)}
              >
                Launch
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
