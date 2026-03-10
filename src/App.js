import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot
} from 'firebase/firestore';
import { 
  Scale, Beaker, ChevronDown, Info, Calculator, 
  Settings, Plus, Trash2, Save, X, Lock, Unlock, 
  KeyRound, StickyNote, Download
} from 'lucide-react';

// --- KONFIGURACJA FIREBASE ---
const firebaseConfig = {
  apiKey: "TWÓJ_API_KEY",
  authDomain: "TWÓJ_PROJEKT.firebaseapp.com",
  projectId: "TWÓJ_PROJEKT_ID",
  storageBucket: "TWÓJ_PROJEKT.appspot.com",
  messagingSenderId: "NUMER_SENDERID",
  appId: "TWÓJ_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const INITIAL_RECIPES = {
  wiejska: {
    id: 'wiejska',
    name: 'Kiełbasa Wiejska',
    description: 'Tradycyjna, mocno czosnkowa, grubo rozdrobniona.',
    ratios: { class1: 0.20, class2: 0.50, class3: 0.20, class4: 0.10 },
    spices: [
      { id: 'salt', name: 'Peklosól / Sól', ratio: 18 },
      { id: 'pepper', name: 'Pieprz czarny', ratio: 2.5 },
      { id: 'garlic', name: 'Czosnek świeży', ratio: 4.0 },
      { id: 'marjoram', name: 'Majeranek', ratio: 1.5 },
      { id: 'water', name: 'Woda zimna (ml)', ratio: 40 }
    ],
    notes: ''
  }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState(INITIAL_RECIPES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPrintTip, setShowPrintTip] = useState(false);
  
  const [selectedKey, setSelectedKey] = useState('wiejska');
  const [totalTarget, setTotalTarget] = useState(0);
  const [classWeights, setClassWeights] = useState({ class1: 0, class2: 0, class3: 0, class4: 0 });
  const [classNotes, setClassNotes] = useState({ class1: '', class2: '', class3: '', class4: '' });
  const [recipeNotes, setRecipeNotes] = useState(''); 
  
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 },
    spices: [{ id: Date.now(), name: '', ratio: 0 }],
    notes: ''
  });

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Błąd logowania:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const recipesRef = collection(db, 'recipes');
    const unsubscribe = onSnapshot(recipesRef, (snapshot) => {
      const dbRecipes = {};
      snapshot.forEach((doc) => { dbRecipes[doc.id] = doc.data(); });
      if (Object.keys(dbRecipes).length > 0) setRecipes(dbRecipes);
      else setRecipes(INITIAL_RECIPES);
    });
    return () => unsubscribe();
  }, [user]);

  const recipe = recipes[selectedKey] || Object.values(recipes)[0];

  useEffect(() => {
    if (totalTarget > 0 && recipe) {
      setClassWeights({
        class1: parseFloat((totalTarget * (recipe.ratios?.class1 || 0)).toFixed(2)),
        class2: parseFloat((totalTarget * (recipe.ratios?.class2 || 0)).toFixed(2)),
        class3: parseFloat((totalTarget * (recipe.ratios?.class3 || 0)).toFixed(2)),
        class4: parseFloat((totalTarget * (recipe.ratios?.class4 || 0)).toFixed(2)),
      });
    }
  }, [totalTarget, selectedKey, recipe]);

  const currentTotal = useMemo(() => {
    return parseFloat((
      (classWeights.class1 || 0) + 
      (classWeights.class2 || 0) + 
      (classWeights.class3 || 0) + 
      (classWeights.class4 || 0)
    ).toFixed(2));
  }, [classWeights]);

  const calculatedSpices = useMemo(() => {
    if (currentTotal <= 0 || !recipe) return null;
    return recipe.spices.map(s => ({
      ...s,
      amount: (currentTotal * s.ratio).toFixed(1)
    }));
  }, [currentTotal, recipe]);

  const handleAdminAccess = () => {
    if (passwordInput === 'admin123') {
      setIsAdmin(true);
      setIsAuthModalOpen(false);
      setAuthError('');
      setPasswordInput('');
    } else { setAuthError('Błędne hasło!'); }
  };

  const handleSaveToDB = async () => {
    if (!newRecipe.name || !user) return;
    const id = newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    const docRef = doc(db, 'recipes', id);
    try {
      await setDoc(docRef, { ...newRecipe, id });
      setIsAdmin(false);
      setSelectedKey(id);
      setNewRecipe({
        name: '', description: '',
        ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 },
        spices: [{ id: Date.now(), name: '', ratio: 0 }],
        notes: ''
      });
    } catch (err) { console.error("Błąd zapisu:", err); }
  };

  const handlePrint = () => {
    setShowPrintTip(true);
    setTimeout(() => {
      window.print();
      setShowPrintTip(false);
    }, 1500);
  };

  const meatClasses = [
    { id: 'class1', label: 'Klasa I', icon: '🥩', sub: 'Chude (szynka, schab)' },
    { id: 'class2', label: 'Klasa II', icon: '🥓', sub: 'Tłuste (łopatka, boczek)' },
    { id: 'class3', label: 'Klasa III', icon: '🍖', sub: 'Klej (golonka, wołowina)' },
    { id: 'class4', label: 'Klasa IV', icon: '🧈', sub: 'Tłuszcz (podgardle, słonina)' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800 print:bg-white print:p-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
        }
        .print-only { display: none; }
      `}</style>

      {showPrintTip && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-slate-700">
          <div className="bg-amber-500 p-2 rounded-full text-slate-900"><Info size={24} /></div>
          <div><p className="font-bold">Przygotowywanie PDF...</p><p className="text-xs text-slate-400">Wybierz "Zapisz jako PDF".</p></div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="bg-slate-800 text-white rounded-3xl p-6 md:p-8 mb-8 shadow-xl border-b-8 border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-700 rounded-2xl border border-slate-600"><Scale size={32} className="text-slate-300" /></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">KALKULATOR <span className="text-slate-400">MASARSKI</span></h1>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Profesjonalna Baza Receptur</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:min-w-[240px]">
              <div className="relative">
                <select className="w-full bg-slate-900 border-2 border-slate-600 text-white rounded-xl py-3 px-4 appearance-none cursor-pointer font-bold" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
                  {Object.entries(recipes).map(([key, r]) => (<option key={key} value={key}>{r.name}</option>))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={20} />
              </div>
            </div>
            <button onClick={() => isAdmin ? setIsAdmin(false) : setIsAuthModalOpen(true)} className={`p-3.5 rounded-xl border-2 ${isAdmin ? 'bg-amber-600 border-amber-700 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
              {isAdmin ? <Unlock size={24} /> : <Lock size={24} />}
            </button>
          </div>
        </header>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-4"><KeyRound size={32} /></div>
              <h3 className="text-xl font-bold text-slate-800 mb-6">Panel Administratora</h3>
              <input type="password" className="w-full border-2 border-slate-100 rounded-xl p-4 text-center text-xl font-bold mb-4" placeholder="Hasło..." value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAccess()} />
              {authError && <p className="text-red-500 text-xs font-bold mb-4">{authError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="flex-1 py-3 font-bold text-slate-400">Anuluj</button>
                <button onClick={handleAdminAccess} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold">WEJDŹ</button>
              </div>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-slate-200">
             <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Settings size={28} /> ZARZĄDZANIE</h2>
                <button onClick={() => setIsAdmin(false)} className="p-2 text-slate-300 hover:text-red-500"><X size={32} /></button>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nazwa</label>
                    <input type="text" className="w-full border-2 border-slate-100 rounded-xl p-4 text-xl font-bold" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} />
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-6 uppercase text-xs">Proporcje Mięsa (%)</h3>
                    {meatClasses.map((c) => (
                      <div key={c.id} className="mb-4">
                        <div className="flex justify-between text-xs font-bold mb-1"><span>{c.label}</span><span>{(newRecipe.ratios[c.id] * 100).toFixed(0)}%</span></div>
                        <input type="range" min="0" max="1" step="0.05" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" value={newRecipe.ratios[c.id]} onChange={e => setNewRecipe({...newRecipe, ratios: {...newRecipe.ratios, [c.id]: parseFloat(e.target.value)}})} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase text-slate-400">Przyprawy (g/kg)</label><button onClick={() => setNewRecipe({...newRecipe, spices: [...newRecipe.
