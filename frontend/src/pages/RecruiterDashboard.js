import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../api";
import { useAuth } from "../AuthContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";
const emptyForm = { title: "", description: "", requiredSkills: "", preferredSkills: "", minExperienceYears: "0" };

export default function RecruiterDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ roleId: "", from: "", to: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
      const [rolesResponse, candidatesResponse] = await Promise.all([
        authFetch(`${API}/api/recruiter/company-roles`),
        authFetch(`${API}/api/recruiter/candidates${query ? `?${query}` : ""}`),
      ]);
      const rolesData = await rolesResponse.json();
      const candidateData = await candidatesResponse.json();
      if (!rolesResponse.ok) throw new Error(rolesData.error?.message);
      if (!candidatesResponse.ok) throw new Error(candidateData.error?.message);
      setRoles(rolesData.companyRoles || []);
      setCandidates(candidateData.candidates || []);
    } catch (loadError) { setError(loadError.message || "Dashboard data could not be loaded."); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function createRole(event) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await authFetch(`${API}/api/recruiter/company-roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          requiredSkills: form.requiredSkills.split(",").map((v) => v.trim()).filter(Boolean),
          preferredSkills: form.preferredSkills.split(",").map((v) => v.trim()).filter(Boolean),
          minExperienceYears: Number(form.minExperienceYears),
          weights: { technical: 50, experience: 30, academic: 20 },
          academicExpectations: {},
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Role could not be created.");
      setForm(emptyForm);
      await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function archiveRole(id) {
    const response = await authFetch(`${API}/api/recruiter/company-roles/${id}`, { method: "DELETE" });
    if (!response.ok) { const data = await response.json(); setError(data.error?.message || "Role could not be archived."); return; }
    await load();
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div><div style={styles.brand}>TrustInterview AI</div><div style={styles.muted}>Recruiter workspace · server-authorized</div></div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={styles.muted}>{profile?.email}</span><button style={styles.secondary} onClick={async () => { await logout(); navigate("/recruiter"); }}>Sign out</button></div>
      </header>
      {error && <div role="alert" style={styles.error}>{error}</div>}
      <section style={styles.grid}>
        <form onSubmit={createRole} style={styles.card}>
          <h2 style={styles.heading}>Create company role</h2>
          <input style={styles.input} required placeholder="Role title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea style={{ ...styles.input, minHeight: 100 }} required placeholder="Job description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input style={styles.input} placeholder="Required skills, comma separated" value={form.requiredSkills} onChange={e => setForm({ ...form, requiredSkills: e.target.value })} />
          <input style={styles.input} placeholder="Preferred skills, comma separated" value={form.preferredSkills} onChange={e => setForm({ ...form, preferredSkills: e.target.value })} />
          <input style={styles.input} type="number" min="0" max="50" step="0.5" placeholder="Minimum experience years" value={form.minExperienceYears} onChange={e => setForm({ ...form, minExperienceYears: e.target.value })} />
          <button disabled={saving} style={styles.primary}>{saving ? "Saving…" : "Publish role"}</button>
        </form>
        <section style={styles.card}>
          <h2 style={styles.heading}>Company roles</h2>
          {roles.length === 0 && <p style={styles.muted}>No roles published yet.</p>}
          {roles.map(role => <div key={role.id} style={styles.row}><div><strong>{role.title}</strong><div style={styles.muted}>{role.active ? "Active" : "Archived"} · {role.required_skills?.join(", ") || "No required skills"}</div></div>{role.active && <button style={styles.secondary} onClick={() => archiveRole(role.id)}>Archive</button>}</div>)}
        </section>
      </section>
      <section style={{ ...styles.card, marginTop: 24, overflowX: "auto" }}>
        <h2 style={styles.heading}>Candidate ATS ranking</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <select style={{ ...styles.input, width: "auto", margin: 0 }} value={filters.roleId} onChange={e => setFilters({ ...filters, roleId: e.target.value })}>
            <option value="">All company roles</option>
            {roles.filter(role => role.active).map(role => <option key={role.id} value={role.id}>{role.title}</option>)}
          </select>
          <input aria-label="Results from date" style={{ ...styles.input, width: "auto", margin: 0 }} type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
          <input aria-label="Results to date" style={{ ...styles.input, width: "auto", margin: 0 }} type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Candidate", "Role", "ATS score", "Interview", "Status", "Submitted"].map(label => <th key={label} style={styles.cell}>{label}</th>)}</tr></thead>
          <tbody>{candidates.map(item => <tr key={item.session_id}><td style={styles.cell}>{item.display_name}<div style={styles.muted}>{item.email}</div></td><td style={styles.cell}>{item.role_title}</td><td style={styles.cell}><strong>{Number(item.overall_score).toFixed(1)}</strong></td><td style={styles.cell}>{item.interview_score == null ? "—" : Number(item.interview_score).toFixed(1)}</td><td style={styles.cell}>{item.status}</td><td style={styles.cell}>{new Date(item.created_at).toLocaleDateString()}</td></tr>)}</tbody>
        </table>
        {candidates.length === 0 && <p style={styles.muted}>Candidate results will appear after mocks against your company roles.</p>}
      </section>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#070711", color: "#f8fafc", padding: 28 },
  header: { maxWidth: 1200, margin: "0 auto 24px", display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center" },
  brand: { fontSize: 22, fontWeight: 900 }, muted: { color: "#85859f", fontSize: 12, marginTop: 4 },
  grid: { maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(300px, .8fr) minmax(360px, 1.2fr)", gap: 24 },
  card: { maxWidth: 1200, marginLeft: "auto", marginRight: "auto", padding: 24, borderRadius: 16, background: "#0f1020", border: "1px solid #252641" },
  heading: { marginTop: 0, fontSize: 18 }, input: { width: "100%", boxSizing: "border-box", marginBottom: 12, padding: 12, borderRadius: 9, border: "1px solid #333550", background: "#090a16", color: "#f8fafc" },
  primary: { width: "100%", padding: 12, border: 0, borderRadius: 9, color: "white", background: "#7c3aed", fontWeight: 800, cursor: "pointer" },
  secondary: { padding: "8px 11px", borderRadius: 8, color: "#c4b5fd", background: "transparent", border: "1px solid #4c3b73", cursor: "pointer" },
  row: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #22233a" },
  cell: { padding: 12, textAlign: "left", borderBottom: "1px solid #22233a", fontSize: 13 },
  error: { maxWidth: 1170, margin: "0 auto 20px", padding: 12, borderRadius: 9, color: "#fecdd3", background: "#3f1422" },
};
