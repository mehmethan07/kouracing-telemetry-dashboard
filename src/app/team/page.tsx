'use client';

import { useState, useEffect } from 'react';
import { Users, Car, Settings, PenLine, Save, Plus, Trash2, X, GitCommit } from 'lucide-react';
import styles from './page.module.css';

interface Driver {
  id: string;
  name: string;
  role: string;
  weight: string;
}

interface VehicleSpec {
  id: string;
  label: string;
  value: string;
}

interface SetupVersion {
  id: string;
  version: string;
  content: string;
  date: string;
}

type TabType = 'drivers' | 'specs' | 'setup';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function TeamPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  const [setupLog, setSetupLog] = useState<SetupVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('drivers');

  // Driver Edit mode state
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [draftDriver, setDraftDriver] = useState<Driver | null>(null);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [newDriver, setNewDriver] = useState<Driver>({ id: '', name: '', role: '', weight: '' });

  // Specs Edit mode state
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [draftSpec, setDraftSpec] = useState<VehicleSpec | null>(null);
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [newSpec, setNewSpec] = useState<VehicleSpec>({ id: '', label: '', value: '' });

  // Setup Version state
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [newVersion, setNewVersion] = useState({ version: '', content: '' });

  useEffect(() => {
    fetch('/api/team')
      .then(res => res.json())
      .then(data => {
        if (data.drivers) setDrivers(data.drivers);
        if (data.specs) setSpecs(data.specs);
        // Map old 'notes' to 'setupLog' for backwards compatibility
        if (data.notes) {
          const mappedLogs = data.notes.map((n: any) => ({
            id: n.id,
            version: n.title?.includes('v') ? n.title : `v1.0-${n.title.substring(0,5)}`,
            content: n.content,
            date: n.date
          }));
          setSetupLog(mappedLogs);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const persistData = async (newDrivers: Driver[], newSpecs: VehicleSpec[], newLog: SetupVersion[]) => {
    setDrivers(newDrivers);
    setSpecs(newSpecs);
    setSetupLog(newLog);
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Save setupLog back as 'notes' field for compatibility with backend file structure
        body: JSON.stringify({ drivers: newDrivers, specs: newSpecs, notes: newLog.map(l => ({ id: l.id, title: l.version, content: l.content, date: l.date })) }),
      });
    } catch (e) {
      console.error('Failed to sync team data');
    }
  };

  // --- Driver Actions ---
  const startAddingDriver = () => {
    setIsAddingDriver(true);
    setNewDriver({ id: `d_${Date.now()}`, name: '', role: '', weight: '' });
    setEditingDriverId(null);
  };
  const confirmAddingDriver = () => {
    if (!newDriver.name.trim()) return;
    persistData([...drivers, newDriver], specs, setupLog);
    setIsAddingDriver(false);
  };
  const startEditingDriver = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setDraftDriver({ ...driver });
    setIsAddingDriver(false);
  };
  const confirmEditingDriver = () => {
    if (!draftDriver || !draftDriver.name.trim()) return;
    const updated = drivers.map(d => d.id === draftDriver.id ? draftDriver : d);
    persistData(updated, specs, setupLog);
    setEditingDriverId(null);
    setDraftDriver(null);
  };
  const removeDriver = (id: string) => {
    if (confirm('Are you sure you want to remove this driver?')) {
      persistData(drivers.filter(d => d.id !== id), specs, setupLog);
    }
  };

  // --- Spec Actions ---
  const startAddingSpec = () => {
    setIsAddingSpec(true);
    setNewSpec({ id: `s_${Date.now()}`, label: '', value: '' });
    setEditingSpecId(null);
  };
  const confirmAddingSpec = () => {
    if (!newSpec.label.trim() || !newSpec.value.trim()) return;
    persistData(drivers, [...specs, newSpec], setupLog);
    setIsAddingSpec(false);
  };
  const startEditingSpec = (spec: VehicleSpec) => {
    setEditingSpecId(spec.id);
    setDraftSpec({ ...spec });
    setIsAddingSpec(false);
  };
  const confirmEditingSpec = () => {
    if (!draftSpec || !draftSpec.label.trim() || !draftSpec.value.trim()) return;
    const updated = specs.map(s => s.id === draftSpec.id ? draftSpec : s);
    persistData(drivers, updated, setupLog);
    setEditingSpecId(null);
    setDraftSpec(null);
  };
  const removeSpec = (id: string) => {
    if (confirm('Are you sure you want to remove this spec?')) {
      persistData(drivers, specs.filter(s => s.id !== id), setupLog);
    }
  };

  // --- Setup Version Actions ---
  const addSetupVersion = () => {
    if (!newVersion.version.trim()) return;
    const v: SetupVersion = {
      id: `v_${Date.now()}`,
      version: newVersion.version.startsWith('v') ? newVersion.version : `v${newVersion.version}`,
      content: newVersion.content,
      date: new Date().toLocaleString('en-US', { hour12: false }),
    };
    persistData(drivers, specs, [v, ...setupLog]);
    setNewVersion({ version: '', content: '' });
    setIsAddingVersion(false);
  };
  const removeSetupVersion = (id: string) => {
    if (confirm('Are you sure you want to delete this setup version?')) {
      persistData(drivers, specs, setupLog.filter(v => v.id !== id));
    }
  };

  if (loading) return <main className={styles.page}><div className="skeleton" style={{height: 400, width: '100%'}}></div></main>;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Settings size={24} color="var(--kou-green-light)" /> GARAGE & TEAM
          </h1>
          <p className={styles.subtitle}>Driver profiles, vehicle specs, and setup version control</p>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'drivers' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          <Users size={16} /> Drivers
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'specs' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('specs')}
        >
          <Car size={16} /> Vehicle Specs
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'setup' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('setup')}
        >
          <GitCommit size={16} /> Setup Versions
        </button>
      </div>

      <div className={styles.contentArea}>
        
        {/* DRIVERS TAB */}
        {activeTab === 'drivers' && (
          <div className={`${styles.section} ${styles.fadeEnter}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Active Roster</h2>
              <button className="btn-primary" onClick={startAddingDriver} disabled={isAddingDriver}>
                <Plus size={14} /> Add Driver
              </button>
            </div>
            
            <div className={styles.driverGrid}>
              {isAddingDriver && (
                <div className={styles.card}>
                  <div className={styles.formGrid}>
                    <input className={styles.input} value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} placeholder="Driver Name" autoFocus />
                    <input className={styles.input} value={newDriver.role} onChange={e => setNewDriver({...newDriver, role: e.target.value})} placeholder="Role (e.g. Main Driver)" />
                    <input className={styles.input} value={newDriver.weight} onChange={e => setNewDriver({...newDriver, weight: e.target.value})} placeholder="Weight (kg)" type="number" />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                      <button className="btn-primary" onClick={confirmAddingDriver} disabled={!newDriver.name.trim()}>
                        <Save size={14} /> Save
                      </button>
                      <button className="btn-icon" onClick={() => setIsAddingDriver(false)}><X size={14} /></button>
                    </div>
                  </div>
                </div>
              )}

              {drivers.map((driver) => (
                <div key={driver.id} className={styles.card}>
                  {editingDriverId === driver.id && draftDriver ? (
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={draftDriver.name} onChange={(e) => setDraftDriver({...draftDriver, name: e.target.value})} placeholder="Name" />
                      <input className={styles.input} value={draftDriver.role} onChange={(e) => setDraftDriver({...draftDriver, role: e.target.value})} placeholder="Role" />
                      <input className={styles.input} value={draftDriver.weight} onChange={(e) => setDraftDriver({...draftDriver, weight: e.target.value})} placeholder="Weight (kg)" type="number" />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                        <button className="btn-primary" onClick={confirmEditingDriver}>
                          <Save size={14} /> Done
                        </button>
                        <button className="btn-icon" onClick={() => setEditingDriverId(null)}><X size={14} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.driverInfo}>
                      <div className={styles.avatar}>{getInitials(driver.name)}</div>
                      <div className={styles.driverDetails}>
                        <div className={styles.driverName}>{driver.name}</div>
                        <div className={styles.driverRole}>{driver.role}</div>
                        <div className={styles.driverWeight}>{driver.weight} kg</div>
                      </div>
                      <div className={styles.cardActions}>
                        <button className="btn-icon" onClick={() => startEditingDriver(driver)} title="Edit"><PenLine size={14} /></button>
                        <button className="btn-icon danger" onClick={() => removeDriver(driver.id)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {drivers.length === 0 && !isAddingDriver && (
                <div className={styles.emptyState}>
                  <Users size={48} />
                  <p>No drivers in roster. Add your first driver.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SPECS TAB */}
        {activeTab === 'specs' && (
          <div className={`${styles.section} ${styles.fadeEnter}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Vehicle Blueprint</h2>
              <button className="btn-primary" onClick={startAddingSpec} disabled={isAddingSpec}>
                <Plus size={14} /> Add Spec
              </button>
            </div>
            
            <div className={styles.specsGrid}>
              {isAddingSpec && (
                <div className={styles.card}>
                  <div className={styles.formGrid}>
                    <input className={styles.input} value={newSpec.label} onChange={e => setNewSpec({...newSpec, label: e.target.value})} placeholder="Label (e.g. Motor)" autoFocus />
                    <input className={styles.input} value={newSpec.value} onChange={e => setNewSpec({...newSpec, value: e.target.value})} placeholder="Value" />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                      <button className="btn-primary" onClick={confirmAddingSpec} disabled={!newSpec.label.trim() || !newSpec.value.trim()}><Save size={14} /> Save</button>
                      <button className="btn-icon" onClick={() => setIsAddingSpec(false)}><X size={14} /></button>
                    </div>
                  </div>
                </div>
              )}

              {specs.map((spec) => (
                <div key={spec.id} className={styles.card}>
                  {editingSpecId === spec.id && draftSpec ? (
                    <div className={styles.formGrid}>
                      <input className={styles.input} value={draftSpec.label} onChange={(e) => setDraftSpec({...draftSpec, label: e.target.value})} placeholder="Label" />
                      <input className={styles.input} value={draftSpec.value} onChange={(e) => setDraftSpec({...draftSpec, value: e.target.value})} placeholder="Value" />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                        <button className="btn-primary" onClick={confirmEditingSpec}><Save size={14} /> Done</button>
                        <button className="btn-icon" onClick={() => setEditingSpecId(null)}><X size={14} /></button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className={styles.driverRole}>{spec.label}</span>
                        <div className={styles.cardActions}>
                          <button className="btn-icon" onClick={() => startEditingSpec(spec)}><PenLine size={14} /></button>
                          <button className="btn-icon danger" onClick={() => removeSpec(spec.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <span className={styles.driverName}>{spec.value}</span>
                    </div>
                  )}
                </div>
              ))}
              
              {specs.length === 0 && !isAddingSpec && (
                <div className={styles.emptyState}>
                  <Car size={48} />
                  <p>No vehicle specs defined. Add motor, chassis, or battery info.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETUP LOGBOOK (Version Control) */}
        {activeTab === 'setup' && (
          <div className={`${styles.section} ${styles.fadeEnter}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Setup Logbook</h2>
              <button className="btn-primary" onClick={() => setIsAddingVersion(!isAddingVersion)}>
                <GitCommit size={14} /> {isAddingVersion ? 'Cancel' : 'New Version'}
              </button>
            </div>

            {isAddingVersion && (
              <div className={styles.card} style={{ marginBottom: '2rem' }}>
                <div className={styles.formGrid}>
                  <input className={styles.input} value={newVersion.version} onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })} placeholder="Version (e.g. 1.0)" autoFocus />
                  <textarea className={styles.textarea} value={newVersion.content} onChange={(e) => setNewVersion({ ...newVersion, content: e.target.value })} placeholder="Describe changes: Front Wing 5 deg, Tire Pressures 1.2 bar..." rows={4} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn-primary" onClick={addSetupVersion} disabled={!newVersion.version.trim()}>
                      <Save size={14} /> Commit Setup
                    </button>
                  </div>
                </div>
              </div>
            )}

            {setupLog.length === 0 && !isAddingVersion ? (
              <div className={styles.emptyState}>
                <GitCommit size={48} />
                <p>No setup versions tracked. Create v1.0 to start logging car configurations.</p>
              </div>
            ) : (
              <div className={styles.timeline}>
                {setupLog.map((log) => (
                  <div key={log.id} className={styles.versionCard}>
                    <div className={styles.versionDot}></div>
                    <div className={styles.versionHeader}>
                      <span className={styles.versionBadge}>{log.version}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className={styles.versionDate}>{log.date}</span>
                        <button className="btn-icon danger" onClick={() => removeSetupVersion(log.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {log.content && <div className={styles.versionContent}>{log.content}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
