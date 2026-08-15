import supabase from './supabase';

const ALLOWED_EVENTS = new Set(['emergency_dose_calculated', 'emergency_self_recheck', 'high_risk_infusion_self_recheck']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function logClinicalAudit({ actorId, eventType, patientId = null, unitName = 'PICU', drugName = null, infusionId = null, weightKg = null, targetDose = null, doseUnit = null, calculatedAmount = null, cappedByMax = null, finalConcentration = null, pumpRateMlHr = null, metadata = {} }) {
  if (!actorId || !ALLOWED_EVENTS.has(eventType)) return { error: new Error('Audit event is not eligible for client logging') };
  const safeMetadata = Object.fromEntries(Object.entries(metadata).filter(([key, value]) => typeof key === 'string' && value !== undefined && value !== null && ['route', 'frequency', 'indication', 'reference', 'source', 'verification_stage'].includes(key)));
  const { error } = await supabase.from('clinical_audit_events').insert({
    event_type: eventType,
    patient_id: UUID_PATTERN.test(String(patientId || '')) ? patientId : null,
    unit_name: unitName || 'PICU',
    actor_id: actorId,
    drug_name: drugName,
    infusion_id: infusionId,
    weight_kg: Number.isFinite(Number(weightKg)) ? Number(weightKg) : null,
    target_dose: Number.isFinite(Number(targetDose)) ? Number(targetDose) : null,
    dose_unit: doseUnit,
    calculated_amount: Number.isFinite(Number(calculatedAmount)) ? Number(calculatedAmount) : null,
    capped_by_max: typeof cappedByMax === 'boolean' ? cappedByMax : null,
    final_concentration: Number.isFinite(Number(finalConcentration)) ? Number(finalConcentration) : null,
    pump_rate_ml_hr: Number.isFinite(Number(pumpRateMlHr)) ? Number(pumpRateMlHr) : null,
    metadata: safeMetadata,
  });
  return { error };
}
