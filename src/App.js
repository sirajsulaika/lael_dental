import { useState, useRef, useEffect, useCallback } from "react";
import initialSchools from "./data/schools.json";
import initialStudents from "./data/students.json";
import initialScreenings from "./data/screenings.json";

const loadData = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const saveData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { }
};

const COLORS = {
  teal: { bg: "#E1F5EE", border: "#1D9E75", text: "#085041", accent: "#1D9E75" },
  blue: { bg: "#E6F1FB", border: "#378ADD", text: "#0C447C", accent: "#185FA5" },
  green: { bg: "#EAF3DE", border: "#639922", text: "#27500A", accent: "#3B6D11" },
  amber: { bg: "#FAEEDA", border: "#BA7517", text: "#633806", accent: "#854F0B" },
  red: { bg: "#FCEBEB", border: "#E24B4A", text: "#791F1F", accent: "#A32D2D" },
  purple: { bg: "#EEEDFE", border: "#7F77DD", text: "#3C3489", accent: "#534AB7" },
  coral: { bg: "#FAECE7", border: "#D85A30", text: "#712B13", accent: "#993C1D" },
  gray: { bg: "#F1EFE8", border: "#888780", text: "#444441", accent: "#5F5E5A" },
};

const HEALTH_BADGE = (score) => {
  if (score >= 95) return { label: "Excellent", color: "#27500A", bg: "#EAF3DE", border: "#639922" };
  if (score >= 80) return { label: "Good", color: "#27500A", bg: "#c0dd97", border: "#3B6D11" };
  if (score >= 65) return { label: "Needs Attention", color: "#633806", bg: "#FAEEDA", border: "#BA7517" };
  return { label: "Urgent Care", color: "#791F1F", bg: "#FCEBEB", border: "#E24B4A" };
};

const TREATMENTS_LIST = [
  "Dental Scaling / Cleaning & Polishing",
  "Fillings",
  "Replacement of missing Teeth",
  "Extractions",
  "Orthodontic Correction",
  "Sealant Application",
  "Fluoride Application",
  "Habit Breaking",
  "Gum Treatment",
  "Bleaching",
  "Surgical Treatment",
];

const calcScore = (findings) => {
  const ohMap = { Good: 30, Fair: 20, Poor: 5 };
  const bgMap = { Good: 25, Fair: 15, Poor: 5 };
  const cavityScore = findings.cavityTeeth && findings.cavityTeeth.length > 0 ? 5 : 20;
  const missingScore = findings.missingTeeth?.trim() ? 5 : 10;
  const stainsScore = findings.stains?.trim() ? 2 : 5;
  const calculusScore = findings.calculus?.trim() ? 2 : 5;
  const impactionScore = findings.impaction?.trim() ? 0 : 5;
  return (
    (ohMap[findings.oralHygiene] ?? 0) +
    (bgMap[findings.bleedingGums] ?? 0) +
    cavityScore + missingScore + stainsScore + calculusScore + impactionScore
  );
};

const genScreeningId = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `DS-${ymd}-${String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0")}`;
};


const SIDEBAR_NAV = [
  { key: "dashboard", icon: "📊", label: "Dashboard" },
  { key: "schools", icon: "🏫", label: "Schools" },
  { key: "students", icon: "👦", label: "Students" },
  { key: "screening", icon: "🦷", label: "New Screening" },
  { key: "screenings", icon: "📋", label: "All Screenings" },
  { key: "reports", icon: "📄", label: "Reports" },
];

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font-sans, system-ui, sans-serif); }
  .app { display: flex; min-height: 100vh; background: var(--color-background-tertiary, #f5f4f0); }
  .sidebar { width: 220px; background: var(--color-background-primary, #fff); border-right: 0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12)); display: flex; flex-direction: column; flex-shrink: 0; }
  .sidebar-header { padding: 1.25rem 1rem; border-bottom: 0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12)); }
  .sidebar-logo { font-size: 13px; font-weight: 500; color: var(--color-text-primary); line-height: 1.4; }
  .sidebar-sub { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
  .sidebar-nav { padding: 0.75rem 0; flex: 1; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 16px; font-size: 14px; cursor: pointer; border-radius: 0; color: var(--color-text-secondary); transition: background 0.1s; border: none; background: none; width: 100%; text-align: left; }
  .nav-item:hover { background: var(--color-background-secondary, rgba(0,0,0,0.04)); color: var(--color-text-primary); }
  .nav-item.active { background: #E1F5EE; color: #085041; font-weight: 500; }
  .main { flex: 1; overflow: auto; }
  .topbar { background: var(--color-background-primary); border-bottom: 0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12)); padding: 0.875rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
  .topbar-title { font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .badge-role { font-size: 11px; padding: 3px 10px; border-radius: 20px; background: #E1F5EE; color: #085041; border: 0.5px solid #1D9E75; }
  .content { padding: 1.5rem; }
  .page-head { margin-bottom: 1.25rem; }
  .page-title { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
  .page-sub { font-size: 13px; color: var(--color-text-secondary); margin-top: 2px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
  .kpi-card { background: var(--color-background-secondary, rgba(0,0,0,0.04)); border-radius: 8px; padding: 1rem; }
  .kpi-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
  .kpi-value { font-size: 22px; font-weight: 500; color: var(--color-text-primary); }
  .kpi-sub { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
  .card { background: var(--color-background-primary, #fff); border: 0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12)); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
  .card-title { font-size: 15px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 1rem; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-group { margin-bottom: 1rem; }
  .form-label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
  .form-input { width: 100%; padding: 8px 10px; border: 0.5px solid var(--color-border-secondary, rgba(0,0,0,0.25)); border-radius: 8px; font-size: 14px; background: var(--color-background-primary); color: var(--color-text-primary); }
  .form-input:focus { outline: none; border-color: #1D9E75; box-shadow: 0 0 0 2px rgba(29,158,117,0.15); }
  .form-select { width: 100%; padding: 8px 10px; border: 0.5px solid var(--color-border-secondary, rgba(0,0,0,0.25)); border-radius: 8px; font-size: 14px; background: var(--color-background-primary); color: var(--color-text-primary); }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 0.5px solid var(--color-border-secondary); background: none; color: var(--color-text-primary); transition: background 0.1s; }
  .btn:hover { background: var(--color-background-secondary); }
  .btn-primary { background: #1D9E75; color: #fff; border-color: #1D9E75; }
  .btn-primary:hover { background: #0F6E56; }
  .btn-danger { background: #E24B4A; color: #fff; border-color: #E24B4A; }
  .btn-sm { padding: 5px 12px; font-size: 12px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 0.5px solid var(--color-border-tertiary); }
  td { padding: 10px 12px; border-bottom: 0.5px solid var(--color-border-tertiary); color: var(--color-text-primary); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--color-background-secondary, rgba(0,0,0,0.02)); }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; border: 0.5px solid; }
  .score-ring { width: 80px; height: 80px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px solid; }
  .score-num { font-size: 22px; font-weight: 500; }
  .score-lbl { font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; }
  .finding-row { display: grid; grid-template-columns: 140px 1fr; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 0.5px solid var(--color-border-tertiary); }
  .finding-row:last-child { border-bottom: none; }
  .finding-label { font-size: 13px; color: var(--color-text-secondary); font-weight: 500; }
  .radio-group { display: flex; gap: 8px; flex-wrap: wrap; }
  .radio-btn { padding: 5px 14px; border-radius: 20px; font-size: 12px; cursor: pointer; border: 0.5px solid var(--color-border-secondary); background: none; color: var(--color-text-secondary); transition: all 0.1s; }
  .radio-btn.selected { background: #1D9E75; color: #fff; border-color: #1D9E75; }
  .photo-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .photo-slot { aspect-ratio: 1; border: 1px dashed var(--color-border-secondary); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.1s; background: var(--color-background-secondary); position: relative; overflow: hidden; }
  .photo-slot:hover { border-color: #1D9E75; }
  .photo-slot img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
  .photo-label { font-size: 10px; color: var(--color-text-secondary); text-align: center; padding: 4px; z-index: 1; }
  .photo-icon { font-size: 18px; z-index: 1; }
  .pdf-preview { background: #fff; border: 0.5px solid var(--color-border-tertiary); border-radius: 12px; padding: 24px; max-width: 680px; margin: 0 auto; }
  .pdf-header { text-align: center; border-bottom: 2px solid #1D9E75; padding-bottom: 12px; margin-bottom: 16px; }
  .pdf-logo-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 6px; }
  .pdf-logo-circle { width: 44px; height: 44px; border-radius: 50%; background: #1D9E75; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; }
  .pdf-title { font-size: 15px; font-weight: 500; color: #085041; }
  .pdf-sub { font-size: 11px; color: #5F5E5A; }
  .pdf-sid { font-size: 11px; color: #888780; margin-top: 4px; }
  .pdf-section { margin-bottom: 14px; }
  .pdf-section-title { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: #1D9E75; border-bottom: 0.5px solid #9FE1CB; padding-bottom: 4px; margin-bottom: 8px; }
  .pdf-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .pdf-field { display: flex; flex-direction: column; }
  .pdf-field-label { font-size: 10px; color: #888780; }
  .pdf-field-value { font-size: 13px; color: #2C2C2A; font-weight: 500; }
  .pdf-finding-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .pdf-finding { background: #F1EFE8; border-radius: 6px; padding: 8px; }
  .pdf-finding-cat { font-size: 10px; color: #5F5E5A; }
  .pdf-finding-val { font-size: 12px; font-weight: 500; color: #2C2C2A; }
  .pdf-score-row { display: flex; align-items: center; gap: 20px; }
  .pdf-photos { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .pdf-photo { aspect-ratio: 1; background: #F1EFE8; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #888780; text-align: center; overflow: hidden; }
  .pdf-photo img { width: 100%; height: 100%; object-fit: cover; }
  .pdf-footer { border-top: 0.5px solid var(--color-border-tertiary); padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #888780; }
  .pdf-qr { width: 60px; height: 60px; background: #F1EFE8; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #888780; text-align: center; border: 0.5px solid var(--color-border-tertiary); }
  .search-bar { display: flex; gap: 10px; margin-bottom: 1rem; }
  .search-input { flex: 1; padding: 8px 12px; border: 0.5px solid var(--color-border-secondary); border-radius: 8px; font-size: 13px; background: var(--color-background-primary); color: var(--color-text-primary); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; padding: 1.5rem; border: 0.5px solid var(--color-border-tertiary, rgba(0,0,0,0.12)); box-shadow: 0 8px 32px rgba(0,0,0,0.2); position: relative; z-index: 101; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  .modal-title { font-size: 16px; font-weight: 500; }
  .modal-close { font-size: 20px; cursor: pointer; color: var(--color-text-secondary); background: none; border: none; line-height: 1; }
  .chart-bar-h { display: flex; flex-direction: column; gap: 8px; }
  .chart-bar-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .chart-bar-label { width: 100px; color: var(--color-text-secondary); text-align: right; flex-shrink: 0; }
  .chart-bar-track { flex: 1; height: 20px; background: var(--color-background-secondary); border-radius: 4px; overflow: hidden; }
  .chart-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
  .chart-bar-val { width: 36px; color: var(--color-text-secondary); font-weight: 500; }
  .tabs { display: flex; gap: 4px; border-bottom: 0.5px solid var(--color-border-tertiary); margin-bottom: 1.25rem; }
  .tab { padding: 8px 16px; font-size: 13px; cursor: pointer; border: none; background: none; color: var(--color-text-secondary); border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tab.active { color: #1D9E75; border-bottom-color: #1D9E75; font-weight: 500; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; }
  .empty-state { text-align: center; padding: 3rem; color: var(--color-text-secondary); }
  .empty-state .icon { font-size: 36px; margin-bottom: 0.75rem; }
  .cam-preview { width: 100%; max-width: 320px; border-radius: 8px; background: #000; }
  .camp-card { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 0; border: 1.5px solid #222; background: #fff; }
  .camp-left { border-right: 1px solid #ccc; padding: 20px; }
  .camp-middle { border-right: 1px solid #ccc; padding: 20px; }
  .camp-right { padding: 20px; }
  .camp-tooth-chart { display: flex; flex-direction: column; gap: 2px; }
  .camp-tooth-row { display: flex; justify-content: center; gap: 1px; }
  .camp-tooth { width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; border: 0.5px solid #aaa; background: #fff; }
  .camp-tooth.affected { background: #E24B4A; color: #fff; }
  .camp-field-list { display: flex; flex-direction: column; gap: 6px; }
  .camp-field { font-size: 12px; border-bottom: 0.5px dotted #ccc; padding-bottom: 4px; }
  .camp-field-label { font-weight: 600; }
  .camp-treatments { display: flex; flex-direction: column; gap: 10px; }
  .camp-treatment-row { display: flex; justify-content: space-between; align-items: center; }
  .camp-checkbox { width: 16px; height: 16px; border: 1.5px solid #1D9E75; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: #1D9E75; font-weight: 700; flex-shrink: 0; }
  .camp-checkbox.checked { background: #E1F5EE; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .tag { font-size: 11px; padding: 3px 10px; border-radius: 20px; border: 0.5px solid var(--color-border-secondary); color: var(--color-text-secondary); background: var(--color-background-secondary); }
  @media (max-width: 640px) {
    .sidebar { display: none; }
    .grid2 { grid-template-columns: 1fr; }
    .photo-grid { grid-template-columns: repeat(3, 1fr); }
    .pdf-finding-grid { grid-template-columns: 1fr 1fr; }
    .pdf-field-grid { grid-template-columns: 1fr; }
  }
`;

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="radio-group">
      {options.map((o) => (
        <button key={o} className={`radio-btn${value === o ? " selected" : ""}`} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

function ScoreBadge({ score }) {
  const b = HEALTH_BADGE(score);
  return (
    <div className="score-ring" style={{ borderColor: b.border, background: b.bg }}>
      <span className="score-num" style={{ color: b.color }}>{score}</span>
      <span className="score-lbl" style={{ color: b.color }}>/100</span>
    </div>
  );
}

function HealthPill({ score }) {
  const b = HEALTH_BADGE(score);
  return (
    <span className="pill" style={{ background: b.bg, color: b.color, borderColor: b.border }}>
      {b.label}
    </span>
  );
}

function PriorityPill({ priority }) {
  const map = {
    Routine: { bg: "#E1F5EE", color: "#085041", border: "#1D9E75" },
    Moderate: { bg: "#FAEEDA", color: "#633806", border: "#BA7517" },
    High: { bg: "#FAECE7", color: "#712B13", border: "#D85A30" },
    Immediate: { bg: "#FCEBEB", color: "#791F1F", border: "#E24B4A" },
  };
  const s = map[priority] || map.Routine;
  return (
    <span className="pill" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {priority}
    </span>
  );
}

function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="chart-bar-row">
      <span className="chart-bar-label">{label}</span>
      <div className="chart-bar-track">
        <div className="chart-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="chart-bar-val">{value}</span>
    </div>
  );
}

function PhotoCapture({ photos, setPhotos }) {
  const slots = ["Front View", "Upper Arch", "Lower Arch", "Tongue", "Lesion"];
  const fileRefs = useRef({});

  const handleFile = (slot, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotos((p) => ({ ...p, [slot]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="photo-grid">
      {slots.map((slot) => (
        <div key={slot} className="photo-slot" onClick={() => fileRefs.current[slot]?.click()}>
          {photos[slot] ? (
            <img src={photos[slot]} alt={slot} />
          ) : (
            <>
              <span className="photo-icon">📷</span>
              <span className="photo-label">{slot}</span>
            </>
          )}
          <input
            ref={(el) => (fileRefs.current[slot] = el)}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handleFile(slot, e)}
          />
        </div>
      ))}
    </div>
  );
}

function PDFReportCard({ screening, student, school, onClose }) {
  if (!screening || !student || !school) return null;
  const makeToothRow = (qL, qR) => {
    const t = [];
    for (let i = 8; i >= 1; i--) t.push(`${qL}${i}`);
    for (let i = 1; i <= 8; i++) t.push(`${qR}${i}`);
    return t;
  };
  const upperTeeth = makeToothRow(1, 2);
  const lowerTeeth = makeToothRow(4, 3);
  const cavityTeeth = screening.cavityTeeth || [];
  const age = student.dob ? new Date().getFullYear() - new Date(student.dob).getFullYear() : "—";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 920 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Camp Card Preview</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="camp-card">
          {/* Left Column — Clinic & Patient */}
          <div className="camp-left">
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, fontFamily: "serif" }}>
                L<span style={{ color: "#1D9E75" }}>|</span>A
              </div>
              <div style={{ fontSize: 9, letterSpacing: 4, fontWeight: 500, margin: "2px 0" }}>DENTAL CARE</div>
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, fontFamily: "serif" }}>
                E<span style={{ color: "#1D9E75" }}>|</span>L
              </div>
            </div>
            <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600 }}>Ph : 93639 12131</div>
            <div style={{ textAlign: "center", fontSize: 10, color: "#666", marginTop: 2 }}>Lakshmipuram Ext., West Tambaram</div>
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 600, marginTop: 8 }}>Dr. Priyanka Paul</div>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <span style={{ display: "inline-block", background: "#f0f0f0", padding: "4px 20px", fontSize: 15, fontWeight: 700, border: "1.5px solid #999" }}>CAMP CARD</span>
            </div>
            <div style={{ marginTop: 18, fontSize: 12, lineHeight: 2.2 }}>
              <div><strong>Name :</strong> {student.name}</div>
              <div style={{ display: "flex", gap: 16 }}>
                <span><strong>Age :</strong> {age}</span>
                <span><strong>Gender :</strong> {student.gender}</span>
              </div>
              <div><strong>School :</strong> {school.name}</div>
              <div><strong>Class :</strong> {student.class} – {student.section}</div>
              <div><strong>Ph No :</strong> {student.mobile}</div>
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <div className="pdf-qr">QR Code</div>
              <span style={{ fontSize: 10, color: "#888", fontWeight: 500 }}>SCAN FOR LOCATION</span>
            </div>
          </div>

          {/* Middle Column — Clinical Findings */}
          <div className="camp-middle">
            <div className="camp-field" style={{ marginBottom: 10, borderBottom: "none" }}>
              <span className="camp-field-label" style={{ fontSize: 13 }}>Chief Complaint :</span>
              <div style={{ marginTop: 4, minHeight: 18 }}>{screening.chiefComplaint || "—"}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="camp-field-label" style={{ marginBottom: 6 }}>Cavity:</div>
              <div className="camp-tooth-chart">
                {[upperTeeth, lowerTeeth].map((row, ri) => (
                  <div key={ri} className="camp-tooth-row">
                    {row.map((id, i) => (
                      <span key={id} className={`camp-tooth${cavityTeeth.includes(id) ? " affected" : ""}`} style={i === 7 ? { marginRight: 8 } : {}}>
                        {id.slice(1)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="camp-field-list">
              {[
                { l: "Oral Hygiene :", v: screening.oralHygiene },
                { l: "Bleeding Gums :", v: screening.bleedingGums },
                { l: "Crowding / Proclination / Spacing :", v: screening.crowding },
                { l: "Missing teeth :", v: screening.missingTeeth },
                { l: "Pockets :", v: screening.pockets },
                { l: "Impaction :", v: screening.impaction },
                { l: "Soft tissue :", v: screening.softTissue },
                { l: "Cervical abrasions :", v: screening.cervicalAbrasions },
                { l: "Stains :", v: screening.stains },
                { l: "Calculus :", v: screening.calculus },
                { l: "Others :", v: screening.others },
              ].map(({ l, v }) => (
                <div key={l} className="camp-field">
                  <span className="camp-field-label">{l}</span> {v || "—"}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — Treatments Advised */}
          <div className="camp-right">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Treatments Advised</div>
            <div className="camp-treatments">
              {TREATMENTS_LIST.map((t) => (
                <div key={t} className="camp-treatment-row">
                  <span style={{ fontSize: 12 }}>{t}</span>
                  <span className={`camp-checkbox${(screening.treatmentsAdvised || []).includes(t) ? " checked" : ""}`}>
                    {(screening.treatmentsAdvised || []).includes(t) ? "✓" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #ccc", marginTop: 16, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 11, color: "#888" }}>
          <div>
            <div style={{ fontWeight: 500, color: "#333" }}>{screening.dentist}</div>
            <div>Date: {screening.date}</div>
            <div>ID: {screening.id}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: 4 }}>Score: {screening.score}/100</div>
            <HealthPill score={screening.score} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print / Download PDF</button>
        </div>
      </div>
    </div>
  );
}

function ScreeningForm({ students, schools, onSave, onClose }) {
  const [step, setStep] = useState(1);
  const [studentId, setStudentId] = useState("");
  const [findings, setFindings] = useState({
    chiefComplaint: "",
    cavityTeeth: [],
    oralHygiene: "Good",
    bleedingGums: "Good",
    crowding: "",
    missingTeeth: "",
    pockets: "",
    impaction: "",
    softTissue: "",
    cervicalAbrasions: "",
    stains: "",
    calculus: "",
    others: "",
    treatmentsAdvised: [],
    priority: "Routine",
  });
  const [photos, setPhotos] = useState({});
  const [dentist, setDentist] = useState("Dr. Priyanka Paul");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const score = calcScore(findings);
  const sid = useRef(genScreeningId());

  const student = students.find((s) => s.id === studentId);
  const school = student ? schools.find((sc) => sc.id === student.schoolId) : null;

  const toggleCavityTooth = (id) => {
    setFindings((f) => {
      const s = new Set(f.cavityTeeth);
      if (s.has(id)) s.delete(id); else s.add(id);
      return { ...f, cavityTeeth: Array.from(s) };
    });
  };

  const toggleTreatment = (t) => {
    setFindings((f) => {
      const s = new Set(f.treatmentsAdvised);
      if (s.has(t)) s.delete(t); else s.add(t);
      return { ...f, treatmentsAdvised: Array.from(s) };
    });
  };

  const makeToothRow = (qL, qR) => {
    const t = [];
    for (let i = 8; i >= 1; i--) t.push(`${qL}${i}`);
    for (let i = 1; i <= 8; i++) t.push(`${qR}${i}`);
    return t;
  };

  const handleSave = () => {
    if (!studentId) return;
    const screening = {
      id: sid.current,
      studentId,
      dentist,
      date,
      ...findings,
      score,
      photos,
    };
    onSave(screening);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">New Dental Screening</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>ID: {sid.current}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="tabs">
          {["Patient", "Findings", "Photos", "Treatment"].map((t, i) => (
            <button key={t} className={`tab${step === i + 1 ? " active" : ""}`} onClick={() => setStep(i + 1)}>
              {i + 1}. {t}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="form-group">
              <label className="form-label">Select Student</label>
              <select className="form-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">— Choose student —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Class {s.class}{s.section})</option>
                ))}
              </select>
            </div>
            {student && (
              <div className="card" style={{ marginTop: 0, background: "#E1F5EE", borderColor: "#9FE1CB" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
                  <div><span style={{ color: "#085041" }}>Name:</span> {student.name}</div>
                  <div><span style={{ color: "#085041" }}>School:</span> {school?.name}</div>
                  <div><span style={{ color: "#085041" }}>Class:</span> {student.class} – {student.section}</div>
                  <div><span style={{ color: "#085041" }}>Parent:</span> {student.parent}</div>
                  <div><span style={{ color: "#085041" }}>Mobile:</span> {student.mobile}</div>
                  <div><span style={{ color: "#085041" }}>Gender:</span> {student.gender}</div>
                </div>
              </div>
            )}
            <div className="grid2" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Dentist Name</label>
                <input className="form-input" value={dentist} onChange={(e) => setDentist(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Screening Date</label>
                <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="form-group">
              <label className="form-label">Chief Complaint</label>
              <input className="form-input" value={findings.chiefComplaint} onChange={(e) => setFindings((f) => ({ ...f, chiefComplaint: e.target.value }))} placeholder="Patient's chief complaint…" />
            </div>

            <div className="form-group">
              <label className="form-label">Cavity (tap affected teeth)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                {[makeToothRow(1, 2), makeToothRow(4, 3)].map((row, ri) => (
                  <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 3 }}>
                    {row.map((id, i) => (
                      <button key={id} type="button" onClick={() => toggleCavityTooth(id)}
                        style={{
                          width: 30, height: 30, border: "1px solid #ccc", borderRadius: 4,
                          background: findings.cavityTeeth.includes(id) ? "#E24B4A" : "#f5f5f5",
                          color: findings.cavityTeeth.includes(id) ? "#fff" : "#333",
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                          marginRight: i === 7 ? 12 : 0,
                        }}>
                        {id.slice(1)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {findings.cavityTeeth.length > 0 && (
                <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 6 }}>
                  Affected: {findings.cavityTeeth.join(", ")}
                </div>
              )}
            </div>

            <div className="finding-row">
              <span className="finding-label">Oral Hygiene</span>
              <RadioGroup options={["Poor", "Fair", "Good"]} value={findings.oralHygiene} onChange={(v) => setFindings((f) => ({ ...f, oralHygiene: v }))} />
            </div>
            <div className="finding-row">
              <span className="finding-label">Bleeding Gums</span>
              <RadioGroup options={["Poor", "Fair", "Good"]} value={findings.bleedingGums} onChange={(v) => setFindings((f) => ({ ...f, bleedingGums: v }))} />
            </div>

            <div className="grid2" style={{ marginTop: 12 }}>
              {[
                { key: "crowding", label: "Crowding / Proclination / Spacing" },
                { key: "missingTeeth", label: "Missing Teeth" },
                { key: "pockets", label: "Pockets" },
                { key: "impaction", label: "Impaction" },
                { key: "softTissue", label: "Soft Tissue" },
                { key: "cervicalAbrasions", label: "Cervical Abrasions" },
                { key: "stains", label: "Stains" },
                { key: "calculus", label: "Calculus" },
                { key: "others", label: "Others" },
              ].map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={findings[key]} onChange={(e) => setFindings((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
              Tap each slot to capture or upload a photo from the camera.
            </p>
            <PhotoCapture photos={photos} setPhotos={setPhotos} />
            <div className="tag-row" style={{ marginTop: 12 }}>
              {["Front View", "Upper Arch", "Lower Arch", "Tongue", "Lesion"].map((s) => (
                <span key={s} className="tag" style={photos[s] ? { borderColor: "#1D9E75", color: "#085041", background: "#E1F5EE" } : {}}>
                  {photos[s] ? "✓" : "○"} {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 16 }}>
              <ScoreBadge score={score} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Oral Health Score: {score}/100</div>
                <HealthPill score={score} />
              </div>
            </div>

            <div className="card-title" style={{ marginTop: 8 }}>Treatments Advised</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {TREATMENTS_LIST.map((t) => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", padding: "6px 0" }}>
                  <input type="checkbox" checked={findings.treatmentsAdvised.includes(t)} onChange={() => toggleTreatment(t)} style={{ accentColor: "#1D9E75" }} />
                  {t}
                </label>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={findings.priority} onChange={(e) => setFindings((f) => ({ ...f, priority: e.target.value }))}>
                {["Routine", "Moderate", "High", "Immediate"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          {step > 1 && <button className="btn" onClick={() => setStep((s) => s - 1)}>← Back</button>}
          {step < 4 && (
            <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !studentId}>
              Next →
            </button>
          )}
          {step === 4 && (
            <button className="btn btn-primary" onClick={handleSave} disabled={!studentId}>
              💾 Save Screening
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ schools, students, screenings }) {
  const total = screenings.length;
  const byScore = (min, max) => screenings.filter((s) => s.score >= min && s.score <= max).length;
  const excellent = byScore(95, 100);
  const good = byScore(80, 94);
  const attention = byScore(65, 79);
  const urgent = byScore(0, 64);
  const districtMap = {};
  schools.forEach((sc) => {
    if (!districtMap[sc.district]) districtMap[sc.district] = { schools: 0, students: 0, screenings: 0 };
    districtMap[sc.district].schools++;
  });
  students.forEach((st) => {
    const sc = schools.find((s) => s.id === st.schoolId);
    if (sc && districtMap[sc.district]) districtMap[sc.district].students++;
  });
  screenings.forEach((scr) => {
    const st = students.find((s) => s.id === scr.studentId);
    const sc = st ? schools.find((s) => s.id === st.schoolId) : null;
    if (sc && districtMap[sc.district]) districtMap[sc.district].screenings++;
  });

  const priorityCounts = { Routine: 0, Moderate: 0, High: 0, Immediate: 0 };
  screenings.forEach((s) => { if (priorityCounts[s.priority] !== undefined) priorityCounts[s.priority]++; });

  return (
    <div>
      <div className="page-head">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">LA EL Dental Care — Screening Overview</div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Schools Covered</div>
          <div className="kpi-value">{schools.length}</div>
          <div className="kpi-sub">across {Object.keys(districtMap).length} districts</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Students Enrolled</div>
          <div className="kpi-value">{students.length}</div>
          <div className="kpi-sub">total registered</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Screenings Done</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-sub">this programme</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Urgent Cases</div>
          <div className="kpi-value" style={{ color: "#A32D2D" }}>{urgent}</div>
          <div className="kpi-sub">score below 65</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title">Health Score Distribution</div>
          <div className="chart-bar-h">
            <HBar label="Excellent (95–100)" value={excellent} max={total || 1} color="#639922" />
            <HBar label="Good (80–94)" value={good} max={total || 1} color="#9FE1CB" />
            <HBar label="Needs Attention" value={attention} max={total || 1} color="#EF9F27" />
            <HBar label="Urgent Care" value={urgent} max={total || 1} color="#E24B4A" />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Treatment Priority</div>
          <div className="chart-bar-h">
            <HBar label="Routine" value={priorityCounts.Routine} max={total || 1} color="#1D9E75" />
            <HBar label="Moderate" value={priorityCounts.Moderate} max={total || 1} color="#EF9F27" />
            <HBar label="High" value={priorityCounts.High} max={total || 1} color="#D85A30" />
            <HBar label="Immediate" value={priorityCounts.Immediate} max={total || 1} color="#E24B4A" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">District-wise Statistics</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>District</th>
                <th>Schools</th>
                <th>Students</th>
                <th>Screenings</th>
                <th>Coverage %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(districtMap).map(([district, data]) => (
                <tr key={district}>
                  <td style={{ fontWeight: 500 }}>{district}</td>
                  <td>{data.schools}</td>
                  <td>{data.students}</td>
                  <td>{data.screenings}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${data.students > 0 ? Math.round((data.screenings / data.students) * 100) : 0}%`, background: "#1D9E75", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {data.students > 0 ? Math.round((data.screenings / data.students) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Recent Screenings</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Screening ID</th>
                <th>Student</th>
                <th>Dentist</th>
                <th>Date</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {screenings.slice(0, 5).map((s) => {
                const student = students.find((st) => st.id === s.studentId);
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{s.id}</td>
                    <td>{student?.name || "—"}</td>
                    <td>{s.dentist}</td>
                    <td>{s.date}</td>
                    <td><span style={{ fontWeight: 500 }}>{s.score}</span></td>
                    <td><HealthPill score={s.score} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SchoolsPage({ schools, setSchools }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", district: "", block: "", principal: "", contact: "" });

  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.district.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name) return;
    const id = `SCH${String(schools.length + 1).padStart(3, "0")}`;
    setSchools((prev) => [...prev, { id, ...form }]);
    setForm({ name: "", district: "", block: "", principal: "", contact: "" });
    setShowAdd(false);
  };

  return (
    <div>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="page-title">School Management</div>
          <div className="page-sub">{schools.length} schools registered</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add School</button>
      </div>
      <div className="search-bar">
        <input className="search-input" placeholder="Search by name or district…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>School Name</th><th>District</th><th>Block</th><th>Principal</th><th>Contact</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)" }}>{s.id}</td>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.district}</td>
                  <td>{s.block}</td>
                  <td>{s.principal}</td>
                  <td>{s.contact}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => setSchools((prev) => prev.filter((sc) => sc.id !== s.id))}>🗑</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "2rem" }}>No schools found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add School</span>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="grid2">
              {[
                { key: "name", label: "School Name" },
                { key: "district", label: "District" },
                { key: "block", label: "Block" },
                { key: "principal", label: "Principal Name" },
                { key: "contact", label: "Contact Number" },
              ].map(({ key, label }) => (
                <div className="form-group" key={key} style={key === "name" ? { gridColumn: "1 / -1" } : {}}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Add School</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentsPage({ students, setStudents, schools }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ schoolId: "", name: "", class: "", section: "", gender: "Male", dob: "", parent: "", mobile: "" });

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name || !form.schoolId) return;
    const id = `STU${String(students.length + 1).padStart(3, "0")}`;
    setStudents((prev) => [...prev, { id, ...form }]);
    setForm({ schoolId: "", name: "", class: "", section: "", gender: "Male", dob: "", parent: "", mobile: "" });
    setShowAdd(false);
  };

  return (
    <div>
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="page-title">Student Management</div>
          <div className="page-sub">{students.length} students registered</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Student</button>
      </div>
      <div className="search-bar">
        <input className="search-input" placeholder="Search by name or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>School</th><th>Class</th><th>Gender</th><th>Parent</th><th>Mobile</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const school = schools.find((sc) => sc.id === s.schoolId);
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--color-text-secondary)" }}>{s.id}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ fontSize: 12 }}>{school?.name || "—"}</td>
                    <td>{s.class} – {s.section}</td>
                    <td>{s.gender}</td>
                    <td>{s.parent}</td>
                    <td>{s.mobile}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => setStudents((prev) => prev.filter((st) => st.id !== s.id))}>🗑</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "2rem" }}>No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Student</span>
              <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="grid2">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">School</label>
                <select className="form-select" value={form.schoolId} onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}>
                  <option value="">— Select school —</option>
                  {schools.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </select>
              </div>
              {[
                { key: "name", label: "Student Name" },
                { key: "parent", label: "Parent Name" },
                { key: "class", label: "Class" },
                { key: "section", label: "Section" },
                { key: "dob", label: "Date of Birth", type: "date" },
                { key: "mobile", label: "Mobile Number" },
              ].map(({ key, label, type }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" type={type || "text"} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-select" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Add Student</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScreeningsPage({ screenings, students, schools, onViewReport }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = screenings.filter((s) => {
    const student = students.find((st) => st.id === s.studentId);
    const matchSearch =
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      (student?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      s.dentist.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || HEALTH_BADGE(s.score).label === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="page-head">
        <div className="page-title">All Screenings</div>
        <div className="page-sub">{screenings.length} screenings recorded</div>
      </div>
      <div className="search-bar">
        <input className="search-input" placeholder="Search by ID, student, or dentist…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-select" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>All</option>
          <option>Excellent</option>
          <option>Good</option>
          <option>Needs Attention</option>
          <option>Urgent Care</option>
        </select>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Screening ID</th><th>Student</th><th>Dentist</th><th>Date</th><th>Oral Hygiene</th><th>Score</th><th>Status</th><th>Priority</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const student = students.find((st) => st.id === s.studentId);
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>{s.id}</td>
                    <td style={{ fontWeight: 500 }}>{student?.name || "—"}</td>
                    <td>{s.dentist}</td>
                    <td>{s.date}</td>
                    <td>{s.oralHygiene}</td>
                    <td><span style={{ fontWeight: 500 }}>{s.score}</span></td>
                    <td><HealthPill score={s.score} /></td>
                    <td><PriorityPill priority={s.priority} /></td>
                    <td>
                      <button className="btn btn-sm" onClick={() => onViewReport(s)}>📄 Report</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "2rem" }}>No screenings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportsPage({ screenings, students, schools }) {
  const urgentCases = screenings.filter((s) => s.score < 65);
  const pending = screenings.filter((s) => (s.treatmentsAdvised || []).length > 0 && s.priority !== "Routine");

  return (
    <div>
      <div className="page-head">
        <div className="page-title">Treatment Dashboard</div>
        <div className="page-sub">Monitor pending and high-priority dental cases</div>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Screenings</div>
          <div className="kpi-value">{screenings.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending Treatment</div>
          <div className="kpi-value" style={{ color: "#BA7517" }}>{pending.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Urgent Cases</div>
          <div className="kpi-value" style={{ color: "#A32D2D" }}>{urgentCases.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Healthy (Score ≥ 80)</div>
          <div className="kpi-value" style={{ color: "#27500A" }}>{screenings.filter((s) => s.score >= 80).length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">🚨 Urgent Care Cases (Score &lt; 65)</div>
        {urgentCases.length === 0 ? (
          <div className="empty-state"><div className="icon">✅</div><div>No urgent cases at this time</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>School</th><th>Score</th><th>Findings</th><th>Treatment</th><th>Priority</th></tr>
              </thead>
              <tbody>
                {urgentCases.map((s) => {
                  const student = students.find((st) => st.id === s.studentId);
                  const school = student ? schools.find((sc) => sc.id === student.schoolId) : null;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{student?.name || "—"}</td>
                      <td style={{ fontSize: 12 }}>{school?.name || "—"}</td>
                      <td><span style={{ fontWeight: 500, color: "#A32D2D" }}>{s.score}</span></td>
                      <td style={{ fontSize: 12 }}>
                        <div>Oral Hygiene: {s.oralHygiene}</div>
                        <div>Bleeding Gums: {s.bleedingGums}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{(s.treatmentsAdvised || []).join(", ") || "—"}</td>
                      <td><PriorityPill priority={s.priority} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [schools, setSchools] = useState(() => loadData("dental_schools", initialSchools));
  const [students, setStudents] = useState(() => loadData("dental_students", initialStudents));
  const [screenings, setScreenings] = useState(() => loadData("dental_screenings", initialScreenings));
  const [showScreeningForm, setShowScreeningForm] = useState(false);
  const [reportScreening, setReportScreening] = useState(null);

  useEffect(() => { saveData("dental_schools", schools); }, [schools]);
  useEffect(() => { saveData("dental_students", students); }, [students]);
  useEffect(() => { saveData("dental_screenings", screenings); }, [screenings]);

  const handleSaveScreening = (screening) => {
    setScreenings((prev) => [screening, ...prev]);
    setPage("screenings");
  };

  const handleViewReport = (screening) => {
    setReportScreening(screening);
  };

  const reportStudent = reportScreening ? students.find((s) => s.id === reportScreening.studentId) : null;
  const reportSchool = reportStudent ? schools.find((s) => s.id === reportStudent.schoolId) : null;

  const pageLabels = {
    dashboard: "Dashboard",
    schools: "School Management",
    students: "Student Management",
    screening: "New Screening",
    screenings: "All Screenings",
    reports: "Reports",
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-header">
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "serif", letterSpacing: 1 }}>L<span style={{ color: "#1D9E75" }}>|</span>A E<span style={{ color: "#1D9E75" }}>|</span>L</div>
            <div className="sidebar-logo">LA EL Dental Care</div>
            <div className="sidebar-sub">Lakshmipuram Ext., West Tambaram</div>
          </div>
          <nav className="sidebar-nav">
            {SIDEBAR_NAV.map(({ key, icon, label }) => (
              <button
                key={key}
                className={`nav-item${page === key ? " active" : ""}`}
                onClick={() => {
                  if (key === "screening") { setShowScreeningForm(true); }
                  else setPage(key);
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div style={{ padding: "1rem", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Dr. Priyanka Paul</div>
            <div className="badge-role" style={{ marginTop: 4, display: "inline-block" }}>Dentist</div>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div className="topbar-title">{pageLabels[page]}</div>
            <div className="topbar-right">
              <button className="btn btn-primary btn-sm" onClick={() => setShowScreeningForm(true)}>
                + New Screening
              </button>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          <div className="content">
            {page === "dashboard" && <Dashboard schools={schools} students={students} screenings={screenings} />}
            {page === "schools" && <SchoolsPage schools={schools} setSchools={setSchools} />}
            {page === "students" && <StudentsPage students={students} setStudents={setStudents} schools={schools} />}
            {page === "screenings" && (
              <ScreeningsPage
                screenings={screenings}
                students={students}
                schools={schools}
                onViewReport={handleViewReport}
              />
            )}
            {page === "reports" && <ReportsPage screenings={screenings} students={students} schools={schools} />}
          </div>
        </div>
      </div>

      {showScreeningForm && (
        <ScreeningForm
          students={students}
          schools={schools}
          onSave={handleSaveScreening}
          onClose={() => setShowScreeningForm(false)}
        />
      )}

      {reportScreening && (
        <PDFReportCard
          screening={reportScreening}
          student={reportStudent}
          school={reportSchool}
          onClose={() => setReportScreening(null)}
        />
      )}
    </>
  );
}
