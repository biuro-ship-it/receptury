import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc 
} from 'firebase/firestore';
import { 
  Scale, Beaker, Calculator, Settings, X, Lock, Unlock, 
  KeyRound, Download, Plus, Trash2, Save, FileText, Edit3, Flame, Thermometer, Zap, Disc, ChevronRight, CheckCircle2, AlertTriangle
} from 'lucide-react';

// --- KONFIGURACJA FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBHj9veFIsL4H-g9n5_WHQuQLzmtn6YzkI",
  authDomain: "kalkulator-masarski.firebaseapp.com",
  projectId: "kalkulator-masarski",
  storageBucket: "kalkulator-masarski.firebasestorage.app",
  messagingSenderId: "75429008764",
  appId: "1:75429008764:web:125be1434f1865864940f9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const INITIAL_RECIPES = {
  wiejska: {
    id: 'wiejska',
    name: 'Kiełbasa Wiejska',
    description: 'Klasyczna wiejska, mocno czosnkowa.',
    ratios: { class1: 0.20, class2: 0.50, class3: 0.20, class4: 0.10 },
    grinding: { class1: 'szarpak', class2: '8mm', class3: '3mm', class4: '8mm' },
    smoking: { wood: 'Olcha/Buk', temp: '55-60°C', time: '3h', drying: '1h' },
    spices: [
      { id: 'salt', name: 'Peklosól / Sól', ratio: 18 },
      { id: 'pepper', name: 'Pieprz czarny', ratio: 2.5 },
      { id: 'garlic', name: 'Czosnek świeży', ratio: 4 }
    ]
  }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState(INITIAL_RECIPES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedKey, setSelectedKey] = useState('wiejska');
  const [totalTarget, setTotalTarget] = useState(0);
  const [classWeights, setClassWeights] = useState({ class1: 0, class2: 0, class3: 0, class4: 0 });
  const [sessionGrinding, setSessionGrinding] = useState({ class1: '', class2: '', class3: '', class4: '' });
  const [finalWeight, setFinalWeight] = useState(0);
  const [smokingNotes, setSmokingNotes] = useState('');
  
  // NOWY STAN: Czy proporcje mięsa zostały zatwierdzone
  const [isMeatCompositionValid, setIsMeatCompositionValid] = useState(false);

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 },
    grinding: { class1: '', class2: '', class3: '', class4: '' },
    smoking: { wood: '', temp: '', time: '', drying: '' },
    spices: [{ id: Date.now(), name: 'Sól', ratio: 18 }]
  });

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error(err));
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const dbRecipes = {};
      snapshot.forEach((doc) => { dbRecipes[doc.id] = doc.data(); });
      if (Object.keys(dbRecipes).length > 0) setRecipes(dbRecipes);
    });
  }, [user]);

  const recipe = useMemo(() => recipes[selectedKey] || Object.values(recipes)[0], [recipes, selectedKey]);

  useEffect(() => {
    if (recipe) {
      setSessionGrinding(recipe.grinding || { class1: '', class2: '', class3: '', class4: '' });
    }
  }, [recipe]);

  useEffect(() => {
    if (totalTarget > 0 && recipe) {
      setClassWeights({
        class1: parseFloat((totalTarget * (recipe.ratios?.class1 || 0)).toFixed(2)),
        class2: parseFloat((totalTarget * (recipe.ratios?.class2 || 0)).toFixed(2)),
        class3: parseFloat((totalTarget * (recipe.ratios?.class3 || 0)).toFixed(2)),
        class4: parseFloat((totalTarget * (recipe.ratios?.class4 || 0)).toFixed(2)),
      });
    }
  }, [totalTarget, recipe]);

  const currentTotal = useMemo(() => {
    return parseFloat(((classWeights.class1 || 0) + (classWeights.class2 || 0) + (classWeights.class3 || 0) + (classWeights.class4 || 0)).toFixed(2));
  }, [classWeights]);

  const yieldValue = useMemo(() => {
    if (!finalWeight || !currentTotal) return null;
    return ((finalWeight / currentTotal) * 100).toFixed(1);
  }, [finalWeight, currentTotal]);

  const calculatedSpices = useMemo(() => {
    if (currentTotal <= 0 || !recipe) return null;
    return recipe.spices.map(s => ({ ...s, amount: (currentTotal * s.ratio).toFixed(1) }));
  }, [currentTotal, recipe]);

  // Obliczanie sumy procentowej w panelu admina
  const totalMeatPercent = useMemo(() => {
    return Math.round(Object.values(newRecipe.ratios).reduce((a, b) => a + b, 0) * 100);
  }, [newRecipe.ratios]);

  // Prosta zmiana suwaka bez wpływania na inne
  const handleIndependentRatioChange = (changedId, newVal) => {
    setNewRecipe({
      ...newRecipe,
      ratios: { ...newRecipe.ratios, [changedId]: newVal }
    });
    setIsMeatCompositionValid(false); // Każda zmiana resetuje zatwierdzenie
  };

  const handleSaveToDB = async () => {
    if (!newRecipe.name || !isMeatCompositionValid) return;
    const id = newRecipe.id || newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'recipes', id), { ...newRecipe, id });
      setNewRecipe({ name: '', description: '', ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 }, grinding: {}, smoking: {}, spices: [{ id: Date.now(), name: 'Sól', ratio: 18 }] });
      setIsMeatCompositionValid(false);
      alert("Receptura zapisana pomyślnie!");
    } catch (err) { alert("Błąd zapisu!"); }
  };

  const meatClasses = [
    { id: 'class1', label: 'Kl. I (chude)', icon: '🥩' },
    { id: 'class2', label: 'Kl. II (tłuste)', icon: '🥓' },
    { id: 'class3', label: 'Kl. III (klej)', icon: '🍖' },
    { id: 'class4', label: 'Kl. IV (tłuszcz)', icon: '🧈' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <style>{`@media print {.no-print {display:none !important;} .print-only {display:block !important;} body {background:white !important;}} .print-only {display:none;}`}</style>
      
      <div className="max-w-7xl mx-auto">
        <header className="bg-slate-900 text-white rounded-3xl p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 no-print shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20"><Scale size={30} /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">Masarski <span className="text-blue-400">Master</span></h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">System Zarządzania Recepturami</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-slate-800 border-2 border-slate-700 text-white rounded-xl py-2 px-4 font-bold outline-none focus:border-blue-500 transition-all" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
              {Object.entries(recipes).map(([key, r]) => (<option key={key} value={key}>{r.name}</option>))}
            </select>
            <button onClick={() => setIsAuthModalOpen(true)} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 border border-slate-700">
              {isAdmin ? <Unlock size={20} className="text-amber-400" /> : <Lock size={20} />}
            </button>
          </div>
        </header>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
              <KeyRound className="mx-auto mb-4 text-blue-600" size={40} />
              <h3 className="font-black mb-6 uppercase tracking-widest text-sm text-slate-400">Dostęp Administracyjny</h3>
              <input type="password" title="Hasło" className="w-full border-2 border-slate-100 rounded-2xl p-4 text-center text-2xl font-black mb-6 focus:border-blue-500 outline-none transition-all" placeholder="••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (passwordInput === 'admin123' ? setIsAdmin(true) || setIsAuthModalOpen(false) : null)} />
              <button onClick={() => { if(passwordInput === 'admin123') { setIsAdmin(true); setIsAuthModalOpen(false); } }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">ZALOGUJ</button>
              <button onClick={() => setIsAuthModalOpen(false)} className="w-full text-slate-400 mt-4 text-[10px] font-black uppercase">Anuluj</button>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-6 no-print">
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border-t-[12px] border-amber-400">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Settings className="text-amber-500" /> Kreator Karty Wyrobu</h2>
                <button onClick={() => setIsAdmin(false)} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors"><X size={32} /></button>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Podstawowe Dane</label>
                    <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-5 text-xl font-black bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} placeholder="Nazwa wyrobu..." />
                    <textarea className="w-full border-2 border-slate-50 rounded-2xl p-5 h-28 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all" value={newRecipe.description} onChange={e => setNewRecipe({...newRecipe, description: e.target.value})} placeholder="Opis procesu mielenia, wędzenia..." />
                  </div>
                  
                  {/* SEKCJA MIĘSA Z BLOKADĄ 100% */}
                  <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] mb-1">Skład Surowcowy</h3>
                            <div className={`flex items-center gap-2 font-black text-lg ${totalMeatPercent === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                {totalMeatPercent === 100 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                                Suma: {totalMeatPercent}% / 100%
                            </div>
                        </div>
                        <button 
                            disabled={totalMeatPercent !== 100}
                            onClick={() => setIsMeatCompositionValid(true)}
                            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isMeatCompositionValid ? 'bg-green-600 text-white shadow-green-200' : totalMeatPercent === 100 ? 'bg-slate-900 text-white shadow-xl animate-pulse' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            {isMeatCompositionValid ? 'SKŁAD ZATWIERDZONY' : 'ZAPISZ SKŁAD MIĘSA'}
                        </button>
                    </div>

                    {meatClasses.map(c => (
                      <div key={c.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 items-center border-b border-slate-200 pb-4 last:border-0">
                        <div className="space-y-2">
                          <p className="font-black text-[11px] uppercase">{c.label} ({(newRecipe.ratios[c.id] * 100).toFixed(0)}%)</p>
                          <input 
                            type="range" min="0" max="1" step="0.01" 
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-blue-600 shadow-inner" 
                            value={newRecipe.ratios[c.id]} 
                            onChange={e => handleIndependentRatioChange(c.id, parseFloat(e.target.value))} 
                          />
                        </div>
                        <div className="relative">
                            <Disc size={14} className="absolute left-3 top-3.5 text-slate-300" />
                            <input type="text" className="w-full border-2 border-white rounded-xl py-3 pl-10 pr-4 text-xs font-black uppercase shadow-sm outline-none focus:border-blue-400 transition-all" placeholder="Sito (np. 8mm)" value={newRecipe.grinding?.[c.id] || ''} onChange={e => setNewRecipe({...newRecipe, grinding: {...newRecipe.grinding, [c.id]: e.target.value}})} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-xl">
                    <h3 className="font-black mb-6 uppercase text-[10px] tracking-[0.2em] text-blue-400">Domyślna Obróbka</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Drewno</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" value={newRecipe.smoking?.wood || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, wood: e.target.value}})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Osuszanie</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" value={newRecipe.smoking?.drying || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, drying: e.target.value}})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Temp. Wędzenia</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" value={newRecipe.smoking?.temp || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, temp: e.target.value}})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest">Czas Wędzenia</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" value={newRecipe.smoking?.time || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, time: e.target.value}})} /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Przyprawy (g / kg)</label> <button onClick={() => setNewRecipe({...newRecipe, spices: [...newRecipe.spices, {id: Date.now(), name: '', ratio: 0}]})} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">+ DODAJ</button></div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {newRecipe.spices.map((s, idx) => (
                        <div key={s.id} className="flex gap-2 items-center bg-white p-3 rounded-2xl border-2 border-slate-50 shadow-sm">
                          <input className="flex-1 text-xs font-black uppercase outline-none" placeholder="Nazwa..." value={s.name} onChange={e => { const u = [...newRecipe.spices]; u[idx].name = e.target.value; setNewRecipe({...newRecipe, spices: u}); }} />
                          <input type="number" className="w-20 border-2 border-slate-100 rounded-lg p-2 text-center font-black text-blue-600" value={s.ratio} onChange={e => { const u = [...newRecipe.spices]; u[idx].ratio = parseFloat(e.target.value) || 0; setNewRecipe({...newRecipe, spices: u}); }} />
                          <button onClick={() => setNewRecipe({...newRecipe, spices: newRecipe.spices.filter(sp => sp.id !== s.id)})} className="text-red-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* PRZYCISK ZAPISU DO BAZY - ZABLOKOWANY DOPÓKI MIĘSO NIE MA 100% I NIE JEST ZATWIERDZONE */}
                  <button 
                    disabled={!isMeatCompositionValid || !newRecipe.name}
                    onClick={handleSaveToDB} 
                    className={`w-full py-6 rounded-3xl font-black shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm ${(!isMeatCompositionValid || !newRecipe.name) ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-2 border-dashed border-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    <Save size={24} /> Zapisz Recepturę w Bazie
                  </button>
                  {!isMeatCompositionValid && totalMeatPercent === 100 && <p className="text-center text-[10px] font-black text-amber-500 uppercase animate-bounce">Zatwierdź skład mięsa powyżej, aby zapisać!</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
              <h3 className="font-black text-slate-800 mb-8 uppercase tracking-[0.2em] text-[10px] border-b pb-4">Baza Receptur ({Object.keys(recipes).length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.values(recipes).map(r => (
                  <div key={r.id} className="p-6 border-2 border-slate-50 rounded-3xl hover:border-blue-100 flex flex-col justify-between group transition-all bg-slate-50/30">
                    <p className="font-black text-slate-900 uppercase text-xs mb-6">{r.name}</p>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setNewRecipe(r); setIsMeatCompositionValid(true); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={18} /></button>
                      <button onClick={async () => { if(window.confirm("Usunąć recepturę bezpowrotnie?")) await deleteDoc(doc(db, 'recipes', r.id)); }} className="p-3 bg-red-50 text-red-500 rounded-2xl shadow-sm hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10">
            {/* LEWA STRONA: KALKULACJA */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border-t-[12px] border-blue-600">
                <div className="bg-slate-900 p-12 rounded-[2.5rem] mb-12 text-white shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <label className="block text-blue-400 text-[11px] font-black uppercase tracking-[0.4em] mb-6">Masa mięsa (kg)</label>
                    <input type="number" className="w-full bg-transparent text-8xl font-black outline-none placeholder:text-slate-800 transition-all focus:scale-[1.02]" placeholder="0.0" onChange={e => setTotalTarget(parseFloat(e.target.value) || 0)} />
                  </div>
                  <Zap className="absolute -right-16 -bottom-16 text-white/5 group-hover:text-blue-500/10 transition-all duration-700" size={300} />
                </div>
                <div className="space-y-6">
                  {meatClasses.map(cls => (
                    <div key={cls.id} className="p-6 bg-slate-50/50 rounded-[2rem] border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5 flex-1">
                          <span className="text-4xl bg-white p-4 rounded-3xl shadow-md border border-slate-50">{cls.icon}</span>
                          <div className="flex-1">
                            <span className="font-black text-slate-800 uppercase text-[15px] leading-none block mb-3">{cls.label}</span>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase">Sugerowane: {(totalTarget * (recipe.ratios?.[cls.id] || 0)).toFixed(2)} kg</span>
                                {recipe.grinding?.[cls.id] && (
                                    <div className="flex items-center gap-2 bg-amber-500 text-white px-3 py-1 rounded-full shadow-sm">
                                        <Disc size={10} />
                                        <span className="text-[9px] font-black uppercase tracking-tighter">SITO: {recipe.grinding[cls.id]}</span>
                                    </div>
                                )}
                            </div>
                          </div>
                        </div>
                        <input type="number" className="w-36 border-2 border-slate-100 rounded-2xl py-4 px-5 text-right font-black text-2xl text-slate-700 bg-white focus:border-blue-600 outline-none shadow-sm transition-all" value={classWeights[cls.id] || ''} onChange={e => setClassWeights({...classWeights, [cls.id]: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-12 p-12 bg-blue-600 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <span className="font-black uppercase text-[11px] tracking-[0.3em] text-blue-100 block mb-2">Suma rzeczywista surowca</span>
                    <p className="text-sm font-bold text-blue-200/60 italic leading-none uppercase">Obliczanie przypraw na podstawie tej wagi</p>
                  </div>
                  <span className="text-6xl font-black relative z-10">{currentTotal} <span className="text-2xl opacity-40">kg</span></span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
              </div>
            </div>

            {/* PRAWA STRONA: PRZEPIS */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl sticky top-8 border-t-[12px] border-slate-900 border-b-8">
                <div className="flex justify-between items-center mb-10 no-print border-b pb-8">
                  <h2 className="font-black flex items-center gap-3 text-slate-900 uppercase tracking-tighter text-xl leading-none"><FileText className="text-blue-600" /> Pobierz przepis</h2>
                  <button onClick={() => window.print()} className="bg-slate-900 text-white p-4 pr-5 rounded-[1.5rem] hover:bg-blue-600 transition-all shadow-xl active:scale-95 flex items-center gap-2">
                    <Download size={22} />
                    <ChevronRight size={20} className="opacity-50" />
                  </button>
                </div>
                <div className="print-only text-center mb-16 border-b-[10px] border-slate-900 pb-12">
                  <h1 className="text-6xl font-black uppercase mb-4 tracking-tighter">{recipe.name}</h1>
                  <p className="text-slate-400 font-bold tracking-[0.5em] uppercase text-xs">Instrukcja produkcji Masarski Master</p>
                </div>
                {calculatedSpices ? (
                  <div className="space-y-8">
                    <div className="p-8 bg-blue-50 rounded-[2.5rem] border-l-[16px] border-blue-600 mb-10 shadow-sm relative overflow-hidden">
                      <h3 className="font-black text-3xl text-blue-900 uppercase mb-4 tracking-tight leading-none">{recipe.name}</h3>
                      <p className="text-xs text-blue-700 leading-relaxed font-bold italic mb-8 opacity-80">"{recipe.description}"</p>
                      <div className="space-y-3 bg-white/60 p-6 rounded-2xl border border-blue-200/50 relative z-10">
                        <h4 className="text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-2 border-b border-blue-100 pb-2 italic">Parametry Sita:</h4>
                        {meatClasses.map(cls => (
                           recipe.grinding?.[cls.id] && (
                             <div key={cls.id} className="flex justify-between text-[11px] font-black uppercase text-blue-900">
                               <span className="opacity-50">{cls.label}:</span>
                               <span className="bg-blue-600 text-white px-3 py-0.5 rounded text-[10px]">SITO {recipe.grinding[cls.id]}</span>
                             </div>
                           )
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2 border-l-4 border-blue-500 pl-3 leading-none">Składniki i Przyprawy</h4>
                      {calculatedSpices.map(s => (
                        <div key={s.id} className={`flex justify-between items-center p-6 rounded-3xl border-2 transition-all duration-300 ${s.id === 'salt' || s.name.toLowerCase().includes('sól') ? 'bg-slate-900 text-white border-slate-900 shadow-2xl scale-[1.02]' : 'bg-white border-slate-50 hover:border-blue-100 hover:shadow-md'}`}>
                          <div className="flex flex-col">
                            <span className="font-black uppercase text-[11px] tracking-widest mb-1">{s.name}</span>
                            <span className="text-[9px] font-bold opacity-30">PROPORCJA: {s.ratio} g/kg</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-black text-4xl tracking-tighter">{s.amount}</span>
                            <span className="text-[11px] font-black opacity-40 uppercase">g</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-200 py-48"><Calculator size={120} className="mx-auto mb-8 opacity-5 animate-pulse" /><p className="font-black uppercase tracking-[0.4em] text-[10px]">Czekam na masę mięsa</p></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
