import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc 
} from 'firebase/firestore';
import { 
  Scale, Beaker, Calculator, Settings, X, Lock, Unlock, 
  KeyRound, Download, Plus, Trash2, Save, FileText, Edit3, Flame, Thermometer, Zap, Disc, ChevronRight
} from 'lucide-react';

// --- TWOJA KONFIGURACJA FIREBASE ---
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

  // Inteligentna blokada 100%
  const handleRatioChange = (changedId, newVal) => {
    const meatIds = ['class1', 'class2', 'class3', 'class4'];
    const otherIds = meatIds.filter(id => id !== changedId);
    const currentRatios = { ...newRecipe.ratios };
    const otherTotal = otherIds.reduce((sum, id) => sum + currentRatios[id], 0);
    const nextRatios = { ...currentRatios, [changedId]: newVal };
    const remaining = 1 - newVal;
    
    if (otherTotal > 0) {
      otherIds.forEach(id => {
        nextRatios[id] = parseFloat(((currentRatios[id] / otherTotal) * remaining).toFixed(2));
      });
    } else {
      otherIds.forEach(id => {
        nextRatios[id] = parseFloat((remaining / 3).toFixed(2));
      });
    }

    const finalSum = Object.values(nextRatios).reduce((a, b) => a + b, 0);
    if (Math.abs(1 - finalSum) > 0.001) {
      const diff = parseFloat((1 - finalSum).toFixed(2));
      nextRatios[otherIds[0]] = parseFloat((nextRatios[otherIds[0]] + diff).toFixed(2));
    }
    setNewRecipe({ ...newRecipe, ratios: nextRatios });
  };

  const handleSaveToDB = async () => {
    if (!newRecipe.name) return;
    const id = newRecipe.id || newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'recipes', id), { ...newRecipe, id });
      setNewRecipe({ name: '', description: '', ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 }, grinding: {}, smoking: {}, spices: [{ id: Date.now(), name: 'Sól', ratio: 18 }] });
      alert("Zapisano pomyślnie!");
    } catch (err) { alert("Błąd bazy danych!"); }
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
            <div className="bg-blue-600 p-3 rounded-2xl"><Scale size={30} /></div>
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
              <h3 className="font-black mb-6 uppercase tracking-widest text-sm text-slate-400">Logowanie Admina</h3>
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
                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Settings className="text-amber-500" /> Kreator Receptury</h2>
                <button onClick={() => setIsAdmin(false)} className="p-2 hover:bg-red-50 rounded-full text-red-500"><X size={32} /></button>
              </div>
              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nazwa i Opis</label>
                    <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-5 text-xl font-black bg-slate-50 focus:bg-white focus:border-blue-500 outline-none" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} placeholder="Nazwa wyrobu..." />
                    <textarea className="w-full border-2 border-slate-50 rounded-2xl p-5 h-28 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 outline-none" value={newRecipe.description} onChange={e => setNewRecipe({...newRecipe, description: e.target.value})} placeholder="Procedura miazgi, wędzenia..." />
                  </div>
                  
                  <div className="p-8 bg-slate-50 rounded-[2rem]">
                    <h3 className="font-black text-slate-400 mb-8 uppercase text-[10px] tracking-widest">Skład % & Sita (Automatyczny bilans 100%)</h3>
                    {meatClasses.map(c => (
                      <div key={c.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 items-center border-b border-slate-200 pb-4 last:border-0">
                        <div className="space-y-2">
                          <p className="font-black text-[11px] uppercase">{c.label} ({(newRecipe.ratios[c.id] * 100).toFixed(0)}%)</p>
                          <input type="range" min="0" max="1" step="0.01" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-blue-600" value={newRecipe.ratios[c.id]} onChange={e => handleRatioChange(c.id, parseFloat(e.target.value))} />
                        </div>
                        <div className="relative">
                            <Disc size={14} className="absolute left-3 top-3.5 text-slate-300" />
                            <input type="text" className="w-full border
