import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
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
    signInAnonymously(auth).catch(err => console.error("Auth error:", err));
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
    return parseFloat(((classWeights.class1 || 0) + (classWeights.class2 || 0) + (classWeights.class3 || 0) + (classWeights.class4 || 0)).toFixed(2));
  }, [classWeights]);

  const calculatedSpices = useMemo(() => {
    if (currentTotal <= 0 || !recipe) return null;
    return recipe.spices.map(s => ({ ...s, amount: (currentTotal * s.ratio).toFixed(1) }));
  }, [currentTotal, recipe]);

  const handleAdminAccess = () => {
    if (passwordInput === 'admin123') {
      setIsAdmin(true); setIsAuthModalOpen(false); setAuthError(''); setPasswordInput('');
    } else { setAuthError('Błędne hasło!'); }
  };

  const handleSaveToDB = async () => {
    if (!newRecipe.name || !user) return;
    const id = newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'recipes', id), { ...newRecipe, id });
      setIsAdmin(false); setSelectedKey(id);
    } catch (err) { console.error("Save error:", err); }
  };

  const meatClasses = [
    { id: 'class1', label: 'Klasa I', icon: '🥩', sub: 'Chude' },
    { id: 'class2', label: 'Klasa II', icon: '🥓', sub: 'Tłuste' },
    { id: 'class3', label: 'Klasa III', icon: '🍖', sub: 'Klej' },
    { id: 'class4', label: 'Klasa IV', icon: '🧈', sub: 'Tłuszcz' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800 print:bg-white print:p-0">
      <style>{`@media print {.no-print {display:none !important;} .print-only {display:block !important;} body {background:white !important;}} .print-only {display:none;}`}</style>
      
      <div className="max-w-6xl mx-auto">
        <header className="bg-slate-800 text-white rounded-3xl p-6 mb-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 no-print">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-700 rounded-2xl"><Scale size={32} /></div>
            <div>
              <h1 className="text-2xl font-bold">KALKULATOR MASARSKI</h1>
              <p className="text-slate-400 text-xs">Profesjonalna Baza Receptur</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-slate-900 border-2 border-slate-600 text-white rounded-xl py-2 px-4 font-bold" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
              {Object.entries(recipes).map(([key, r]) => (<option key={key} value={key}>{r.name}</option>))}
            </select>
            <button onClick={() => isAdmin ? setIsAdmin(false) : setIsAuthModalOpen(true)} className="p-3 bg-slate-900 rounded-xl">
              {isAdmin ? <Unlock size={20} /> : <Lock size={20} />}
            </button>
          </div>
        </header>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
              <KeyRound className="mx-auto mb-4 text-slate-400" size={40} />
              <input type="password" className="w-full border-2 rounded-xl p-3 text-center mb-4" placeholder="Hasło admina" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAccess()} />
              <button onClick={handleAdminAccess} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">ZALOGUJ</button>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <div className="flex justify-between mb-8">
              <h2 className="text-xl font-bold">DODAJ PRZEPIS</h2>
              <button onClick={() => setIsAdmin(false)}><X /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <input type="text" className="w-full border-2 p-4 rounded-xl font-bold" placeholder="Nazwa kiełbasy" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} />
              <button onClick={handleSaveToDB} className="bg-slate-800 text-white rounded-xl font-bold">ZAPISZ W BAZIE</button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-xl no-print">
              <div className="bg-slate-800 p-8 rounded-2xl mb-8">
                <label className="block text-slate-400 text-xs mb-2">MASA MIĘSA (KG)</label>
                <input type="number" className="w-full bg-transparent text-white text-5xl font-bold outline-none" placeholder="0.0" onChange={e => setTotalTarget(parseFloat(e.target.value) || 0)} />
              </div>
              {meatClasses.map(cls => (
                <div key={cls.id} className="flex items-center justify-between p-4 border-b">
                  <span>{cls.icon} <b>{cls.label}</b></span>
                  <input type="number" className="w-24 border-2 rounded-lg p-2 text-right font-bold" value={classWeights[cls.id] || ''} onChange={e => setClassWeights({...classWeights, [cls.id]: parseFloat(e.target.value) || 0})} />
                </div>
              ))}
              <div className="mt-8 text-3xl font-bold text-right">SUMA: {currentTotal} kg</div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="font-bold flex items-center gap-2"><Beaker /> PRZEPIS</h2>
                <button onClick={() => window.print()} className="bg-slate-100 p-2 rounded-lg"><Download size={20} /></button>
              </div>
              <div className="print-only text-center mb-8"><h1>RECEPTURA: {recipe.name}</h1></div>
              {calculatedSpices ? (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl mb-4">
                    <h3 className="font-bold">{recipe.name}</h3>
                    <p className="text-sm text-slate-500">{recipe.description}</p>
                  </div>
                  {calculatedSpices.map(s => (
                    <div key={s.id} className={`flex justify-between p-4 rounded-xl border ${s.id === 'salt' ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                      <span>{s.name}</span>
                      <span className="font-bold text-xl">{s.amount} {s.name.includes('ml') ? '' : 'g'}</span>
                    </div>
                  ))}
                  <textarea className="w-full mt-4 p-4 bg-slate-50 rounded-xl h-32 no-print" placeholder="Twoje notatki..." value={recipeNotes} onChange={e => setRecipeNotes(e.target.value)} />
                </div>
              ) : (
                <div className="text-center text-slate-300 py-20"><Calculator size={48} className="mx-auto" /><p>WPISZ WAGĘ MIĘSA</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
