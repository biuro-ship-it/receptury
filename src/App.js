import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { 
  Scale, Beaker, Calculator, Settings, X, Lock, Unlock, 
  KeyRound, Download, Plus, Trash2, Save, FileText, Edit3, Flame, Zap, Disc, ChevronRight, Weight
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
  const [compMode, setCompMode] = useState('percent'); // 'percent' lub 'weight'
  const [wInputs, setWInputs] = useState({ class1: 0, class2: 0, class3: 0, class4: 0 });
  const [isValidated, setIsValidated] = useState(false);

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 },
    grinding: { class1: '', class2: '', class3: '', class4: '' },
    smoking: { wood: '', temp: '', time: '', drying: '' },
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

  const currentTotal = useMemo(() => Object.values(classWeights).reduce((a, b) => a + b, 0).toFixed(2), [classWeights]);

  const calculatedSpices = useMemo(() => {
    if (currentTotal <= 0 || !recipe) return null;
    return recipe.spices.map(s => ({ ...s, amount: (currentTotal * s.ratio).toFixed(1) }));
  }, [currentTotal, recipe]);

  const sumPercent = useMemo(() => Math.round(Object.values(newRecipe.ratios).reduce((a, b) => a + b, 0) * 100), [newRecipe.ratios]);

  // KONWERSJA WAGI NA %
  const convertWeights = () => {
    const total = Object.values(wInputs).reduce((a, b) => a + b, 0);
    if (total <= 0) return;
    const newRatios = {};
    meatClasses.forEach(c => { newRatios[c.id] = parseFloat((wInputs[c.id] / total).toFixed(4)); });
    setNewRecipe({ ...newRecipe, ratios: newRatios });
    setIsValidated(true);
    setCompMode('percent');
  };

  const handleSave = async () => {
    if (!newRecipe.name || sumPercent !== 100) return;
    const id = newRecipe.id || newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'recipes', id), { ...newRecipe, id });
      setIsAdmin(false);
      setIsValidated(false);
      alert("Zapisano!");
    } catch (e) { alert("Błąd zapisu!"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="bg-slate-900 text-white rounded-3xl p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl no-print">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl"><Scale size={30} /></div>
            <h1 className="text-2xl font-black uppercase italic">Masarski Master</h1>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-slate-800 border-none text-white rounded-xl py-2 px-4 font-bold" value={selectedKey} onChange={e => setSelectedKey(e.target.value)}>
              {Object.values(recipes).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={() => setIsAuthModalOpen(true)} className="p-3 bg-slate-800 rounded-xl">
              {isAdmin ? <Unlock size={20} className="text-amber-400" /> : <Lock size={20} />}
            </button>
          </div>
        </header>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full">
              <input type="password" title="Hasło" className="w-full border-2 p-4 rounded-xl text-center text-xl font-bold mb-4 outline-none" placeholder="Hasło (admin123)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && passwordInput === 'admin123' && (setIsAdmin(true) || setIsAuthModalOpen(false))} />
              <button onClick={() => passwordInput === 'admin123' && (setIsAdmin(true) || setIsAuthModalOpen(false))} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">ZALOGUJ</button>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-t-[12px] border-amber-400 no-print space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase flex items-center gap-3"><Settings className="text-amber-500" /> Kreator Karty Wyrobu</h2>
              <button onClick={() => setIsAdmin(false)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><X size={32} /></button>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
              {/* LEWA KOLUMNA: MIĘSO */}
              <div className="space-y-6">
                <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-xl font-black focus:border-blue-500 outline-none" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} placeholder="Nazwa wyrobu..." />
                
                <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-200 shadow-inner">
                  {/* PRZEŁĄCZNIK TRYBU - TERAZ BARDZIEJ WIDOCZNY */}
                  <div className="flex bg-blue-100 p-1.5 rounded-2xl mb-8 border-2 border-blue-200">
                    <button type="button" onClick={() => setCompMode('percent')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${compMode === 'percent' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>Skład %</button>
                    <button type="button" onClick={() => setCompMode('weight')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${compMode === 'weight' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>Skład wagowy (kg)</button>
                  </div>

                  <div className="flex justify-between items-center mb-6">
                    <span className={`font-black text-xl px-4 py-2 rounded-xl ${sumPercent === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>Suma: {sumPercent}%</span>
                    {compMode === 'weight' ? (
                        <button type="button" onClick={convertWeights} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-blue-700">Przelicz na %</button>
                    ) : (
                        <button type="button" disabled={sumPercent !== 100} onClick={() => setIsValidated(true)} className={`px-6 py-3 rounded-xl font-black text-xs uppercase transition-all ${isValidated ? 'bg-green-600 text-white' : sumPercent === 100 ? 'bg-slate-900 text-white animate-pulse' : 'bg-slate-200 text-slate-400'}`}>
                            {isValidated ? 'Zatwierdzono' : 'Zatwierdź skład'}
                        </button>
                    )}
                  </div>

                  {meatClasses.map(c => (
                    <div key={c.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 items-center p-4 bg-white rounded-2xl shadow-sm">
                      <div>
                        <p className="font-black text-[11px] uppercase text-slate-400 mb-2">{c.label}</p>
                        {compMode === 'percent' ? (
                          <div className="flex items-center gap-3">
                             <input type="range" min="0" max="1" step="0.01" className="flex-1 accent-blue-600" value={newRecipe.ratios[c.id]} onChange={e => { setNewRecipe({...newRecipe, ratios: {...newRecipe.ratios, [c.id]: parseFloat(e.target.value)}}); setIsValidated(false); }} />
                             <span className="text-sm font-black w-10 text-right">{(newRecipe.ratios[c.id]*100).toFixed(0)}%</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <input type="number" className="w-full border-2 border-slate-100 p-3 rounded-xl font-black text-blue-600 outline-none focus:border-blue-400" value={wInputs[c.id]} onChange={e => setWInputs({...wInputs, [c.id]: parseFloat(e.target.value) || 0})} />
                            <span className="absolute right-3 top-3.5 text-[10px] font-black text-slate-300">KG</span>
                          </div>
                        )}
                      </div>
                      <div className="relative">
                         <label className="text-[10px] font-black uppercase text-slate-300 mb-1 block">Zalecane Sito</label>
                         <Disc size={12} className="absolute left-3 bottom-4 text-slate-300" />
                         <input type="text" className="w-full border-2 border-slate-50 p-3 pl-9 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-amber-400 bg-slate-50" placeholder="Np. 8mm" value={newRecipe.grinding?.[c.id] || ''} onChange={e => setNewRecipe({...newRecipe, grinding: {...newRecipe.grinding, [c.id]: e.target.value}})} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRAWA KOLUMNA: PRZYPRAWY I ZAPIS */}
              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                  <h3 className="font-black mb-6 uppercase text-[10px] tracking-widest text-blue-400">Domyślna Obróbka</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black opacity-40 uppercase">Drewno</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" value={newRecipe.smoking?.wood || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, wood: e.target.value}})} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black opacity-40 uppercase">Temp. Wędzenia</label><input className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" value={newRecipe.smoking?.temp || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, temp: e.target.value}})} /></div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
                  <div className="flex justify-between items-center mb-6"><h4 className="text-[10px] font-black uppercase text-slate-400">Przyprawy (g/kg)</h4> <button type="button" onClick={() => setNewRecipe({...newRecipe, spices: [...newRecipe.spices, {id:Date.now(), name:'', ratio:0}]})} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg hover:bg-blue-700">+ DODAJ</button></div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {newRecipe.spices.map((s, idx) => (
                      <div key={s.id} className="flex gap-2 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                        <input className="flex-1 text-xs font-black uppercase outline-none px-2" value={s.name} placeholder="Składnik..." onChange={e => { const u = [...newRecipe.spices]; u[idx].name = e.target.value; setNewRecipe({...newRecipe, spices: u}); }} />
                        <input type="number" className="w-20 border-2 border-slate-50 rounded-lg p-2 text-center font-black text-blue-600 bg-slate-50" value={s.ratio} onChange={e => { const u = [...newRecipe.spices]; u[idx].ratio = parseFloat(e.target.value) || 0; setNewRecipe({...newRecipe, spices: u}); }} />
                        <button type="button" onClick={() => setNewRecipe({...newRecipe, spices: newRecipe.spices.filter(sp => sp.id !== s.id)})} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4">
                    <button type="button" onClick={handleSave} disabled={!isValidated || !newRecipe.name} className={`w-full py-6 rounded-[2rem] font-black shadow-2xl transition-all uppercase tracking-widest text-sm ${(!isValidated || !newRecipe.name) ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-2 border-dashed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02]'}`}>
                      <Save className="inline-block mr-3" size={24} /> Zapisz recepturę w bazie
                    </button>
                    {(!isValidated && sumPercent === 100) && <p className="text-center text-[10px] font-black text-amber-500 uppercase mt-4 animate-bounce">Zatwierdź skład mięsa powyżej!</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
            {/* WIDOK KALKULATORA DLA KLIENTA / MASARZA */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border-t-[12px] border-blue-600">
                <div className="bg-slate-900 p-12 rounded-[2.5rem] mb-12 text-white shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <label className="block
