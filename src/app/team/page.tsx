'use client';

import { useState } from 'react';
import { Users, Car, Settings, PenLine, Save, Plus, Trash2 } from 'lucide-react';
import styles from './page.module.css';

interface Driver {
  id: string;
  name: string;
  role: string;
  weight: string;
}

interface SetupNote {
  id: string;
  title: string;
  content: string;
  date: string;
}

function getStoredDrivers(): Driver[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('kou_team_drivers');
    return raw ? JSON.parse(raw) : [
      { id: '1', name: 'Driver 1', role: 'Main Driver', weight: '75' },
      { id: '2', name: 'Driver 2', role: 'Test Driver', weight: '70' },
    ];
  } catch {
    return [];
  }
}

function getStoredNotes(): SetupNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('kou_team_notes');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function TeamPage() {
  const [drivers, setDrivers] = useState<Driver[]>(getStoredDrivers);
  const [notes, setNotes] = useState<SetupNote[]>(getStoredNotes);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editingDriver, setEditingDriver] = useState<string | null>(null);

  const saveDrivers = (updated: Driver[]) => {
    setDrivers(updated);
    localStorage.setItem('kou_team_drivers', JSON.stringify(updated));
  };

  const saveNotes = (updated: SetupNote[]) => {
    setNotes(updated);
    localStorage.setItem('kou_team_notes', JSON.stringify(updated));
  };

  const addDriver = () => {
    const id = `d_${Date.now()}`;
    saveDrivers([...drivers, { id, name: 'New Driver', role: 'Driver', weight: '70' }]);
    setEditingDriver(id);
  };

  const updateDriver = (id: string, field: keyof Driver, value: string) => {
    saveDrivers(drivers.map((d) => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDriver = (id: string) => {
    saveDrivers(drivers.filter((d) => d.id !== id));
  };

  const addNote = () => {
    if (!newNote.title.trim()) return;
    const note: SetupNote = {
      id: `n_${Date.now()}`,
      title: newNote.title,
      content: newNote.content,
      date: new Date().toLocaleString('tr-TR'),
    };
    saveNotes([note, ...notes]);
    setNewNote({ title: '', content: '' });
  };

  const removeNote = (id: string) => {
    saveNotes(notes.filter((n) => n.id !== id));
  };

  // Vehicle config
  const vehicleSpecs = [
    { label: 'Motor', value: 'EMRAX 228' },
    { label: 'Battery', value: '96S LiFePO4' },
    { label: 'Inverter', value: 'Cascadia PM100' },
    { label: 'Max Power', value: '80 kW' },
    { label: 'Max Torque', value: '240 Nm' },
    { label: 'Curb Weight', value: '285 kg' },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Users size={24} /> TEAM MANAGEMENT
          </h1>
          <p className={styles.subtitle}>Drivers, vehicle specs & setup notes</p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Drivers Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Users size={18} /> Drivers
            </h2>
            <button className={styles.addBtn} onClick={addDriver}>
              <Plus size={14} /> Add
            </button>
          </div>
          <div className={styles.driverList}>
            {drivers.map((driver) => (
              <div key={driver.id} className={styles.driverCard}>
                {editingDriver === driver.id ? (
                  <div className={styles.driverEdit}>
                    <input
                      className={styles.input}
                      value={driver.name}
                      onChange={(e) => updateDriver(driver.id, 'name', e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      className={styles.input}
                      value={driver.role}
                      onChange={(e) => updateDriver(driver.id, 'role', e.target.value)}
                      placeholder="Role"
                    />
                    <input
                      className={styles.input}
                      value={driver.weight}
                      onChange={(e) => updateDriver(driver.id, 'weight', e.target.value)}
                      placeholder="Weight (kg)"
                      type="number"
                    />
                    <button className={styles.saveBtn} onClick={() => setEditingDriver(null)}>
                      <Save size={14} /> Done
                    </button>
                  </div>
                ) : (
                  <div className={styles.driverInfo}>
                    <div>
                      <div className={styles.driverName}>{driver.name}</div>
                      <div className={styles.driverRole}>{driver.role}</div>
                      <div className={styles.driverWeight}>{driver.weight} kg</div>
                    </div>
                    <div className={styles.driverActions}>
                      <button className={styles.iconBtn} onClick={() => setEditingDriver(driver.id)}>
                        <PenLine size={14} />
                      </button>
                      <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => removeDriver(driver.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Specs */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Car size={18} /> Vehicle Specifications
            </h2>
          </div>
          <div className={styles.specsList}>
            {vehicleSpecs.map((spec) => (
              <div key={spec.label} className={styles.specRow}>
                <span className={styles.specLabel}>{spec.label}</span>
                <span className={styles.specValue}>{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Notes */}
        <div className={`${styles.section} ${styles.notesSection}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Settings size={18} /> Setup Notes
            </h2>
          </div>

          <div className={styles.noteForm}>
            <input
              className={styles.input}
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              placeholder="Note title..."
            />
            <textarea
              className={styles.textarea}
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Suspension settings, tire pressure, aero config..."
              rows={3}
            />
            <button className={styles.addNoteBtn} onClick={addNote} disabled={!newNote.title.trim()}>
              <Plus size={14} /> Add Note
            </button>
          </div>

          <div className={styles.notesList}>
            {notes.map((note) => (
              <div key={note.id} className={styles.noteCard}>
                <div className={styles.noteHeader}>
                  <h3 className={styles.noteTitle}>{note.title}</h3>
                  <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => removeNote(note.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {note.content && <p className={styles.noteContent}>{note.content}</p>}
                <span className={styles.noteDate}>{note.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
