import supabase from './supabase';

export async function deletePatientRecord(patientId) {
  if (!patientId) return { error: new Error('Patient record ID is required') };
  const { data: images, error: imageQueryError } = await supabase.from('patient_images').select('storage_path').eq('patient_id', patientId);
  if (imageQueryError) return { error: imageQueryError };
  const paths = (images || []).map((image) => image.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from('patient-images').remove(paths);
    if (storageError) return { error: storageError };
  }
  return supabase.from('patients').delete().eq('id', patientId);
}
