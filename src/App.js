import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { 
  Scale, Calculator, Settings, X, Lock, Unlock, 
  KeyRound, Download, Plus, Trash2, Save, FileText, Edit3, Flame, Zap, Disc, ChevronRight, ClipboardList
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

const meatClasses = [
  { id: 'class1', label: 'Kl. I (chude)', icon: '🥩' },
  { id: 'class2', label: 'Kl. II (tłuste)', icon: '🥓' },
  { id: 'class3', label: 'Kl. III (klej)', icon: '🍖' },
  { id: 'class4', label: 'Kl. IV (tłuszcz)', icon: '🧈' },
];

const App = () => {
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [totalTarget, setTotalTarget] = useState(0);
  const [classWeights, setClassWeights] = useState({ class1: 0, class2: 0, class3: 0, class4: 0 });
  const [smokingNotes, setSmokingNotes] = useState('');
  
  // ADMIN PANEL STATES
  const [compMode, setCompMode] = useState('percent'); 
  const [wInputs, setWInputs] = useState({ class1: 0, class2: 0, class3: 0, class4: 0 });
  const [isValidated, setIsValidated] = useState(false);

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 },
    grinding: { class1: '', class2: '', class3: '', class4: '' },
    tech: { settling: '', wood: '', drying: '', smokeTemp: '', smokeTime: '' },
    spices: [{ id: Date.now(), name: 'Sól', ratio: 18 }]
  });

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const dbRecipes = {};
      snapshot.forEach((doc) => { dbRecipes[doc.id] = doc.data(); });
      setRecipes(dbRecipes);
      if (!selectedKey && Object.keys(dbRecipes).length > 0) setSelectedKey(Object.keys(dbRecipes)[0]);
    });
  }, [user, selectedKey]);

  const recipe = useMemo(() => recipes[selectedKey] || Object.values(recipes)[0], [recipes, selectedKey]);

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
    const sum = Object.values(classWeights).reduce((a, b) => a + b, 0);
    return parseFloat(sum).toFixed(2);
  }, [classWeights]);

  const calculatedSpices = useMemo(() => {
    const total = parseFloat(currentTotal);
    if (isNaN(total) || total <= 0 || !recipe) return null;
    return recipe.spices.map(s => ({ ...s, amount: (total * s.ratio).toFixed(1) }));
  }, [currentTotal, recipe]);

  const sumPercent = useMemo(() => Math.round(Object.values(newRecipe.ratios).reduce((a, b) => a + b, 0) * 100), [newRecipe.ratios]);
  const sumKg = useMemo(() => Object.values(wInputs).reduce((a, b) => a + b, 0).toFixed(2), [wInputs]);

  const convertWeights = () => {
    const total = Object.values(wInputs).reduce((a, b) => a + b, 0);
    if (total <= 0) return alert("Wpisz wagi mięsa!");
    const newRatios = {};
    meatClasses.forEach(c => { newRatios[c.id] = parseFloat((wInputs[c.id] / total).toFixed(4)); });
    setNewRecipe({ ...newRecipe, ratios: newRatios });
    setIsValidated(true);
    setCompMode('percent');
  };

  const handleSave = async () => {
    if (!newRecipe.name || sumPercent !== 100) return alert("Podaj nazwę i upewnij się, że suma to 100%!");
    const id = newRecipe.id || newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'recipes', id), { ...newRecipe, id });
      setNewRecipe({ name: '', description: '', ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 }, grinding: {}, tech: {}, spices: [{ id: Date.now(), name: 'Sól', ratio: 18 }] });
      setIsValidated(false);
      alert("Zapisano pomyślnie!");
    } catch (e) { alert("Błąd zapisu!"); }
  };

  const startEdit = (r) => {
    setNewRecipe(r);
    setIsValidated(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <style>{`@media print {.no-print {display:none !important;} .print-only {display:block !important;} body {background:white !important;}} .print-only {display:none;}`}</style>
      
      <div className="max-w-7xl mx-auto">
        <header className="bg-slate-900 text-white rounded-3xl p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl no-print">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg"><Scale size={30} /></div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-blue-100">Masarski Master</h1>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-slate-800 border-none text-white rounded-xl py-2 px-4 font-bold outline-none focus:ring-2 focus:ring-blue-500" value={selectedKey} onChange={e => setSelectedKey(e.target.value)}>
              {Object.values(recipes).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={() => setIsAuthModalOpen(true)} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
              {isAdmin ? <Unlock size={20} className="text-amber-400" /> : <Lock size={20} />}
            </button>
          </div>
        </header>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
              <KeyRound className="mx-auto mb-4 text-blue-600" size={40} />
              <input type="password" title="Hasło" className="w-full border-2 p-4 rounded-xl text-center text-xl font-bold mb-4 outline-none focus:border-blue-500" placeholder="Hasło (admin123)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && passwordInput === 'admin123' && (setIsAdmin(true) || setIsAuthModalOpen(false))} />
              <button onClick={() => passwordInput === 'admin123' && (setIsAdmin(true) || setIsAuthModalOpen(false))} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">ZALOGUJ</button>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-8 no-print animate-in fade-in duration-300">
            {/* KREATOR RECEPTURY */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-t-[12px] border-amber-400">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black uppercase flex items-center gap-3"><Settings className="text-amber-500" /> Edytor Receptury</h2>
                <button onClick={() => setIsAdmin(false)} className="text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"><X size={32} /></button>
              </div>

              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nazwa i Opis procesu</label>
                    <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-xl font-black bg-slate-50 focus:bg-white transition-all outline-none" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} placeholder="Nazwa wyrobu..." />
                    <textarea className="w-full border-2 border-slate-100 rounded-2xl p-5 h-28 text-sm bg-slate-50 focus:bg-white transition-all outline-none" value={newRecipe.description} onChange={e => setNewRecipe({...newRecipe, description: e.target.value})} placeholder="Opis przygotowania (historia, miazgi itp)..." />
                  </div>
                  
                  {/* KONFIGURACJA MIĘSA */}
                  <div className="p-6 bg-slate-100 rounded-[2.5rem] border-2 border-slate-200 shadow-inner">
                    <div className="flex bg-white p-2 rounded-2xl mb-8 border-2 border-blue-500">
                      <button type="button" onClick={() => setCompMode('percent')} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${compMode === 'percent' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600'}`}>Skład %</button>
                      <button type="button" onClick={() => setCompMode('weight')} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${compMode === 'weight' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600'}`}>Wagi (kg)</button>
                    </div>

                    <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                      <span className={`font-black text-xl ${compMode === 'percent' ? (sumPercent === 100 ? 'text-green-600' : 'text-amber-600') : 'text-blue-600'}`}>
                          {compMode === 'percent' ? `SUMA: ${sumPercent}%` : `WAGA: ${sumKg} kg`}
                      </span>
                      {compMode === 'weight' ? (
                          <button type="button" onClick={convertWeights} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-blue-700">PRZELICZ NA %</button>
                      ) : (
                          <button type="button" disabled={sumPercent !== 100} onClick={() => setIsValidated(true)} className={`px-6 py-3 rounded-xl font-black text-xs uppercase transition-all shadow-md ${isValidated ? 'bg-green-600 text-white' : sumPercent === 100 ? 'bg-slate-900 text-white animate-pulse' : 'bg-slate-200 text-slate-400'}`}>
                              {isValidated ? 'ZATWIERDZONO' : 'ZATWIERDŹ 100%'}
                          </button>
                      )}
                    </div>

                    {meatClasses.map(c => (
                      <div key={c.id} className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          <div>
                            <p className="font-black text-[11px] uppercase text-slate-400 mb-2">{c.label}</p>
                            {compMode === 'percent' ? (
                              <div className="flex items-center gap-3">
                                 <input type="range" min="0" max="1" step="0.01" className="flex-1 accent-blue-600 h-2" value={newRecipe.ratios[c.id]} onChange={e => { setNewRecipe({...newRecipe, ratios: {...newRecipe.ratios, [c.id]: parseFloat(e.target.value)}}); setIsValidated(false); }} />
                                 <span className="text-sm font-black w-10 text-right">{(newRecipe.ratios[c.id]*100).toFixed(0)}%</span>
                              </div>
                            ) : (
                              <div className="relative">
                                <input type="number" className="w-full border-2 border-slate-100 p-3 rounded-xl font-black text-blue-600 outline-none" value={wInputs[c.id]} onChange={e => setWInputs({...wInputs, [c.id]: parseFloat(e.target.value) || 0})} />
                                <span className="absolute right-3 top-3.5 text-[10px] font-black text-slate-300">kg</span>
                              </div>
                            )}
                          </div>
                          <div className="relative">
                             <label className="text-[9px] font-black uppercase text-slate-300 mb-1 block">ZALECANE SITO</label>
                             <Disc size={12} className="absolute left-3 bottom-4 text-slate-300" />
                             <input type="text" className="w-full border-2 border-slate-50 p-3 pl-9 rounded-xl text-[10px] font-bold uppercase outline-none bg-slate-50" placeholder="Np. 8mm" value={newRecipe.grinding?.[c.id] || ''} onChange={e => setNewRecipe({...newRecipe, grinding: {...newRecipe.grinding, [c.id]: e.target.value}})} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  {/* TABELA TECHNOLOGICZNA */}
                  <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-xl">
                    <h3 className="font-black mb-8 uppercase text-[10px] tracking-widest text-blue-400 border-b border-blue-900 pb-4">Parametry Obróbki Technicznej</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none block">Osadzanie</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newRecipe.tech?.settling || ''} onChange={e => setNewRecipe({...newRecipe, tech: {...newRecipe.tech, settling: e.target.value}})} placeholder="Np. 2h / 12st" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none block">Osuszanie</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newRecipe.tech?.drying || ''} onChange={e => setNewRecipe({...newRecipe, tech: {...newRecipe.tech, drying: e.target.value}})} placeholder="Np. 45 min" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none block">Drewno</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newRecipe.tech?.wood || ''} onChange={e => setNewRecipe({...newRecipe, tech: {...newRecipe.tech, wood: e.target.value}})} placeholder="Np. Olcha" /></div>
                      <div className="space-y-2"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none block">Temp. Wędzenia</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newRecipe.tech?.smokeTemp || ''} onChange={e => setNewRecipe({...newRecipe, tech: {...newRecipe.tech, smokeTemp: e.target.value}})} placeholder="Np. 55°C" /></div>
                      <div className="space-y-2 col-span-2"><label className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none block">Czas Wędzenia / Parzenia</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none" value={newRecipe.tech?.smokeTime || ''} onChange={e => setNewRecipe({...newRecipe, tech: {...newRecipe.tech, smokeTime: e.target.value}})} placeholder="Np. 3h wędzenia + parzenie do 68°C" /></div>
                    </div>
                  </div>

                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100">
                    <div className="flex justify-between items-center mb-6"><h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Przyprawy (g/kg)</h4> <button type="button" onClick={() => setNewRecipe({...newRecipe, spices: [...newRecipe.spices, {id:Date.now(), name:'', ratio:0}]})} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-blue-400/30">+ DODAJ</button></div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {newRecipe.spices.map((s, idx) => (
                        <div key={s.id} className="flex gap-2 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                          <input className="flex-1 text-xs font-black uppercase outline-none px-2 bg-transparent" value={s.name} placeholder="Składnik..." onChange={e => { const u = [...newRecipe.spices]; u[idx].name = e.target.value; setNewRecipe({...newRecipe, spices: u}); }} />
                          <input type="number" className="w-20 border-2 border-slate-50 rounded-xl p-2 text-center font-black text-blue-600 bg-slate-50" value={s.ratio} onChange={e => { const u = [...newRecipe.spices]; u[idx].ratio = parseFloat(e.target.value) || 0; setNewRecipe({...newRecipe, spices: u}); }} />
                          <button type="button" onClick={() => setNewRecipe({...newRecipe, spices: newRecipe.spices.filter(sp => sp.id !== s.id)})} className="text-red-200 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-6">
                      <button type="button" onClick={handleSave} disabled={!isValidated || !newRecipe.name} className={`w-full py-7 rounded-[2.5rem] font-black shadow-2xl transition-all uppercase tracking-widest text-sm ${(!isValidated || !newRecipe.name) ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-2 border-dashed border-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.01]'}`}>
                        <Save className="inline-block mr-3" size={24} /> ZAPISZ RECEPTURĘ W BAZIE
                      </button>
                  </div>
                </div>
              </div>
            </div>

            {/* LISTA RECEPTUR DO EDYCJI */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
              <h3 className="font-black text-slate-800 mb-8 uppercase tracking-[0.2em] text-[10px] border-b pb-4">Zapisane Receptury w Bazie ({Object.keys(recipes).length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.values(recipes).map(r => (
                  <div key={r.id} className="p-6 border-2 border-slate-50 rounded-3xl hover:border-blue-100 flex flex-col justify-between group transition-all hover:shadow-lg bg-slate-50/30">
                    <div>
                        <p className="font-black text-slate-900 uppercase text-xs mb-2 leading-tight">{r.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{r.description || "Brak opisu"}</p>
                    </div>
                    <div className="flex gap-2 justify-end mt-6">
                      <button onClick={() => startEdit(r)} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit3 size={18} /></button>
                      <button onClick={async () => { if(window.confirm("Usunąć bezpowrotnie?")) await deleteDoc(doc(db, 'recipes', r.id)); }} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10">
            {/* WIDOK KALKULATORA */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border-t-[12px] border-blue-600">
                <div className="bg-slate-900 p-12 rounded-[2.5rem] mb-12 text-white shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <label className="block text-blue-400 text-[11px] font-black uppercase tracking-[0.4em] mb-6">Masa mięsa do obróbki (kg)</label>
                    <input type="number" className="w-full bg-transparent text-8xl font-black outline-none placeholder:text-slate-800 transition-all" placeholder="0.0" onChange={e => setTotalTarget(parseFloat(e.target.value) || 0)} />
                  </div>
                  <Zap className="absolute -right-16 -bottom-16 text-white/5 group-hover:text-blue-500/10 transition-all duration-700" size={300} />
                </div>
                <div className="space-y-4">
                  {meatClasses.map(cls => (
                    <div key={cls.id} className="p-6 bg-slate-50/50 rounded-[2rem] border-2 border-transparent hover:border-blue-100 flex justify-between items-center transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl bg-white p-3 rounded-2xl shadow-sm">{cls.icon}</span>
                        <div><span className="font-black text-slate-800 uppercase text-sm block mb-1 leading-none">{cls.label}</span>
                          <div className="flex gap-2">
                            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase leading-none">Sugerowane: {(totalTarget * (recipe?.ratios?.[cls.id] || 0)).toFixed(2)} kg</span>
                            {recipe?.grinding?.[cls.id] && <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase tracking-tighter leading-none shadow-sm">Sito: {recipe.grinding[cls.id]}</span>}
                          </div>
                        </div>
                      </div>
                      <input type="number" className="w-32 border-2 border-slate-100 rounded-2xl py-3 px-4 text-right font-black text-2xl text-slate-700 bg-white shadow-inner focus:border-blue-600 outline-none transition-all" value={classWeights[cls.id] || ''} onChange={e => setClassWeights({...classWeights, [cls.id]: parseFloat(e.target.value) || 0})} />
                    </div>
                  ))}
                </div>
                <div className="mt-12 p-10 bg-blue-600 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl">
                  <span className="font-black uppercase text-[11px] tracking-[0.3em] opacity-60">Suma Farszu</span>
                  <span className="text-6xl font-black">{parseFloat(Object.values(classWeights).reduce((a, b) => a + b, 0)).toFixed(2)} <span className="text-2xl opacity-40 uppercase tracking-tighter">kg</span></span>
                </div>
              </div>
              
              <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border-t-[10px] border-amber-500 no-print">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-amber-500 p-3.5 rounded-2xl text-white shadow-lg shadow-amber-500/20"><Flame size={26} /></div>
                  <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800 italic">Dziennik produkcyjny</h3>
                </div>
                <textarea className="w-full border-2 border-slate-50 bg-slate-50 rounded-[2rem] p-6 h-40 text-sm italic font-medium text-slate-600 focus:bg-white focus:border-amber-400 transition-all outline-none shadow-inner" placeholder="Notatki technologa z dzisiejszego wędzenia..." value={smokingNotes} onChange={e => setSmokingNotes(e.target.value)} />
              </div>
            </div>

            {/* KARTA PRZEPISU */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl sticky top-8 border-t-[12px] border-slate-900 border-b-8 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center mb-10 no-print border-b pb-8">
                  <h2 className="font-black text-slate-900 uppercase text-lg flex items-center gap-2 tracking-tighter leading-none"><FileText className="text-blue-600" /> Pobierz przepis</h2>
                  <button onClick={() => window.print()} className="bg-slate-900 text-white p-4 pr-5 rounded-[1.5rem] hover:bg-blue-600 transition-all shadow-xl active:scale-95 flex items-center gap-2 font-black uppercase text-xs tracking-widest leading-none"><Download size={22} /><ChevronRight size={20} className="opacity-50" /></button>
                </div>
                {recipe ? (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="p-8 bg-blue-50 rounded-[2.5rem] border-l-[16px] border-blue-600 shadow-sm relative">
                      <h3 className="font-black text-3xl text-blue-900 uppercase mb-4 tracking-tighter leading-none italic">{recipe?.name}</h3>
                      <p className="text-xs text-blue-700 leading-relaxed font-bold italic mb-6 opacity-80 leading-relaxed">"{recipe?.description}"</p>
                      
                      {/* WYŚWIETLANIE PARAMETRÓW TECHNICZNYCH NA KARCIE */}
                      {recipe.tech && (
                          <div className="mb-6 grid grid-cols-2 gap-4 bg-white/50 p-4 rounded-2xl border border-blue-100 shadow-inner">
                              <div className="space-y-1"><span className="text-[8px] font-black opacity-30 uppercase block">Osadzanie:</span><span className="text-[10px] font-black text-blue-900">{recipe.tech.settling || '--'}</span></div>
                              <div className="space-y-1"><span className="text-[8px] font-black opacity-30 uppercase block">Osuszanie:</span><span className="text-[10px] font-black text-blue-900">{recipe.tech.drying || '--'}</span></div>
                              <div className="space-y-1"><span className="text-[8px] font-black opacity-30 uppercase block">Drewno:</span><span className="text-[10px] font-black text-blue-900">{recipe.tech.wood || '--'}</span></div>
                              <div className="space-y-1"><span className="text-[8px] font-black opacity-30 uppercase block">Temp. wędz.:</span><span className="text-[10px] font-black text-blue-900">{recipe.tech.smokeTemp || '--'}</span></div>
                              <div className="space-y-1 col-span-2 border-t pt-2 border-blue-100"><span className="text-[8px] font-black opacity-30 uppercase block">Wskazówki wędzenia:</span><span className="text-[10px] font-black text-blue-900 leading-tight block">{recipe.tech.smokeTime || '--'}</span></div>
                          </div>
                      )}

                      <div className="space-y-3 bg-white/60 p-6 rounded-2xl border border-blue-200/50 relative z-10 shadow-sm">
                        <h4 className="text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em] mb-2 border-b border-blue-100 pb-2 italic">Standard Mielenia:</h4>
                        {meatClasses.map(cls => (
                           recipe.grinding?.[cls.id] && (
                             <div key={cls.id} className="flex justify-between text-[11px] font-black uppercase text-blue-900">
                               <span className="opacity-50 leading-none">{cls.icon} {cls.label}:</span>
                               <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-black leading-none uppercase">SITO {recipe.grinding[cls.id]}</span>
                             </div>
                           )
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2 border-l-4 border-blue-500 pl-3 leading-none italic uppercase">Wykaz Składników (DAWKOWANIE)</h4>
                      {calculatedSpices && calculatedSpices.map(s => (
                        <div key={s.id} className={`flex justify-between items-center p-6 rounded-3xl border-2 transition-all duration-300 shadow-sm ${s.id === 'salt' || s.name.toLowerCase().includes('sól') ? 'bg-slate-900 text-white border-slate-900 shadow-2xl scale-[1.02]' : 'bg-white border-slate-50 hover:border-blue-100'}`}>
                          <div className="flex flex-col">
                            <span className="font-black uppercase text-[11px] tracking-widest mb-1 leading-none italic">{s.name}</span>
                            <span className="text-[9px] font-bold opacity-30 italic leading-none uppercase">DAWKA: {s.ratio} g/kg</span>
                          </div>
                          <div className="flex items-baseline gap-1"><span className="font-black text-4xl tracking-tighter leading-none">{s.amount}</span><span className="text-[11px] font-black opacity-40 uppercase leading-none">g</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-200 py-48"><Calculator size={120} className="mx-auto mb-8 opacity-5 animate-pulse" /><p className="font-black uppercase tracking-[0.4em] text-[10px] italic">Wpisz masę mięsa po lewej</p></div>
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
