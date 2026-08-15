import supabase from './supabase';
import { normalizeAuditPatientId, sanitizeAuditMetadata } from './auditValidation';

const ALLOWED_EVENTS = new Set(['emergency_dose_calculated', 'emergency_self_recheck', 'high_risk_infusion_self_recheck']);

export async function logClinicalAudit({ actorId, eventType, patientId = null, unitName = 'PICU', drugName = null, infusionId = null, weightKg = null, targetDose = null, doseUnit = null, calculatedAmount = null, cappedByMax = null, finalConcentration = null, pumpRateMlHr = null, metadata = {} }) {
  if (!actorId || !ALLOWED_EVENTS.has(eventType)) return { error: new Error('Audit event is not eligible for client logging') };
  const safeMetadata = sanitizeAuditMetadata(metadata);
  const { error } = await supabase.from('clinical_audit_events').insert({
    event_type: eventType,
    patient_id: normalizeAuditPatientId(patientId),
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
