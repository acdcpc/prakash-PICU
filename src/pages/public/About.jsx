import { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';

export default function About() {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // Public profile details live on the profiles row.
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, designation, hospital')
      .limit(1)
      .single();
    if (profile) setDoctor(profile);
    setLoading(false);
  }

  return (
    <div className="p-4">
      <h1>About OurPICU</h1>

      {/* Unit Section */}
      <div className="card mt-2">
        <div className="card-head">
          <strong>Pediatric Intensive Care Unit</strong>
        </div>
        <div className="card-body">
          <p>
            OurPICU is the clinical decision-support platform for the Pediatric Intensive
            Care Unit at <strong>Patan Academy of Health Sciences (PAHS)</strong>,
            Lalitpur, Nepal. PAHS is a not-for-profit public institution dedicated to
            training healthcare professionals who will serve in underserved rural
            communities across Nepal.
          </p>
          <p className="mt-1">
            The PICU provides critical care for children with life-threatening conditions
            including respiratory failure, septic shock, neurological emergencies, and
            post-surgical care. This platform is designed to support clinicians at the
            bedside with evidence-based tools for safer, more efficient care.
          </p>
        </div>
      </div>

      {/* Team Section */}
      {loading ? (
        <div className="flex items-c jc-between p-4">
          <div className="loader"></div>
          <span className="ml-2 text-muted">Loading…</span>
        </div>
      ) : doctor ? (
        <div className="card mt-2">
          <div className="card-head">
            <strong>Clinical Team</strong>
          </div>
          <div className="card-body">
            <div className="rrow">
              <div className="rlbl">Lead Clinician</div>
              <div className="rval">{doctor.full_name || '—'}</div>
            </div>
            {doctor.designation && (
              <div className="rrow">
                <div className="rlbl">Designation</div>
                <div className="rval">{doctor.designation}</div>
              </div>
            )}
            {doctor.hospital && (
              <div className="rrow">
                <div className="rlbl">Hospital</div>
                <div className="rval">{doctor.hospital}</div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Contact */}
      <div className="card mt-2">
        <div className="card-head">
          <strong>Contact</strong>
        </div>
        <div className="card-body">
          <div className="rrow">
            <div className="rlbl">Institution</div>
            <div className="rval">Patan Academy of Health Sciences</div>
          </div>
          <div className="rrow">
            <div className="rlbl">Location</div>
            <div className="rval">Lagankhel, Lalitpur, Nepal</div>
          </div>
          <div className="rrow">
            <div className="rlbl">Website</div>
            <div className="rval">
              <a href="https://www.pahs.edu.np" target="_blank" rel="noopener noreferrer">
                www.pahs.edu.np
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
