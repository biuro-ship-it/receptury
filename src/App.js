import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc 
} from 'firebase/firestore';
import { 
  Scale, Beaker, Calculator, Settings, X, Lock, Unlock, 
  KeyRound, Download, Plus, Trash2, Save, FileText, Edit3
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
    description: 'Tradycyjna kiełbasa. Mielenie: Kl. I szarpak, Kl. II 8mm, Kl. III 3mm.',
    ratios: { class1: 0.20, class2: 0.50, class3: 0.20, class4: 0.10 },
    spices: [
      { id: 'salt', name: 'Peklosól / Sól', ratio: 18 },
      { id: 'pepper', name: 'Pieprz czarny', ratio: 2.5 }
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
  const [recipeNotes, setRecipeNotes] = useState(''); 

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 },
    spices: [{ id: Date.now(), name: 'Sól', ratio: 18 }]
  });

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Błąd logowania:", err));
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const recipesRef = collection(db, 'recipes');
    return onSnapshot(recipesRef, (snapshot) => {
      const dbRecipes = {};
      snapshot.forEach((doc) => { dbRecipes[doc.id] = doc.data(); });
      if (Object.keys(dbRecipes).length > 0) {
        setRecipes(dbRecipes);
      } else {
        setRecipes(INITIAL_RECIPES);
      }
    });
  }, [user]);

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
    return parseFloat(((classWeights.class1 || 0) + (classWeights.class2 || 0) + (classWeights.class3 || 0) + (classWeights.class4 || 0)).toFixed(2));
  }, [classWeights]);

  const calculatedSpices = useMemo(() => {
    if (currentTotal <= 0 || !recipe) return null;
    return recipe.spices.map(s => ({ ...s, amount: (currentTotal * s.ratio).toFixed(1) }));
  }, [currentTotal, recipe]);

  const handleSaveToDB = async () => {
    if (!newRecipe.name) return;
    const id = newRecipe.id || newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'recipes', id), { ...newRecipe, id });
      setNewRecipe({ name: '', description: '', ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 }, spices: [{ id: Date.now(), name: 'Sól', ratio: 18 }] });
      alert("Zapisano pomyślnie!");
    } catch (err) { alert("Błąd zapisu! Sprawdź reguły Firestore."); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę recepturę?")) {
      try {
        await deleteDoc(doc(db, 'recipes', id));
        if (selectedKey === id) setSelectedKey('wiejska');
      } catch (err) { alert("Błąd podczas usuwania."); }
    }
  };

  const startEdit = (r) => {
    setNewRecipe(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const meatClasses = [
    { id: 'class1', label: 'Kl. I (chude)', icon: '🥩' },
    { id: 'class2', label: 'Kl. II (tłuste)', icon: '🥓' },
    { id: 'class3', label: 'Kl. III (klej)', icon: '🍖' },
    { id: 'class4', label: 'Kl. IV (tłuszcz)', icon: '🧈' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800">
      <style>{`@media print {.no-print {display:none !important;} .print-only {display:block !important;} body {background:white !important;}} .print-only {display:none;}`}</style>
      
      <div className="max-w-6xl mx-auto">
        <header className="bg-slate-800 text-white rounded-3xl p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
          <div className="flex items-center gap-4">
            <Scale size={32} />
            <h1 className="text-2xl font-bold uppercase tracking-tight">Kalkulator Masarski <span className="text-slate-500 text-sm">PRO</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-slate-900 border-2 border-slate-600 text-white rounded-xl py-2 px-4 font-bold" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
              {Object.entries(recipes).map(([key, r]) => (<option key={key} value={key}>{r.name}</option>))}
            </select>
            <button onClick={() => setIsAuthModalOpen(true)} className="p-3 bg-slate-900 rounded-xl hover:bg-slate-700">
              {isAdmin ? <Unlock size={20} className="text-amber-400" /> : <Lock size={20} />}
            </button>
          </div>
        </header>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
              <KeyRound className="mx-auto mb-4 text-slate-400" size={40} />
              <input type="password" title="Hasło" className="w-full border-2 rounded-xl p-3 text-center mb-6" placeholder="Hasło (admin123)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (passwordInput === 'admin123' ? setIsAdmin(true) || setIsAuthModalOpen(false) : null)} />
              <button onClick={() => { if(passwordInput === 'admin123') { setIsAdmin(true); setIsAuthModalOpen(false); } }} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">WEJDŹ</button>
              <button onClick={() => setIsAuthModalOpen(false)} className="w-full text-slate-400 mt-2 text-sm">Anuluj</button>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-8 no-print">
            {/* FORMULARZ EDYCJI/DODAWANIA */}
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border-2 border-amber-200">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black flex items-center gap-3"><Settings className="text-amber-500" /> {newRecipe.id ? 'EDYCJA RECEPTURY' : 'NOWA RECEPTURA'}</h2>
                <button onClick={() => setIsAdmin(false)} className="p-2 text-red-500"><X size={32} /></button>
              </div>
              <div className="grid lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <input type="text" className="w-full border-2 border-slate-100 rounded-xl p-4 text-xl font-bold" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} placeholder="Nazwa wyrobu..." />
                  <textarea className="w-full border-2 border-slate-100 rounded-xl p-4 h-32 text-sm" value={newRecipe.description} onChange={e => setNewRecipe({...newRecipe, description: e.target.value})} placeholder="Procedura miazgi i przygotowania..." />
                  <div className="bg-slate-50 p-6 rounded-2xl">
                    <h3 className="font-bold text-slate-700 mb-4 uppercase text-xs">Skład Surowcowy (%)</h3>
                    {meatClasses.map(c => (
                      <div key={c.id} className="mb-4">
                        <div className="flex justify-between text-xs font-bold mb-1"><span>{c.label}</span><span>{(newRecipe.ratios[c.id] * 100).toFixed(0)}%</span></div>
                        <input type="range" min="0" max="1" step="0.05" className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-slate-600" value={newRecipe.ratios[c.id]} onChange={e => setNewRecipe({...newRecipe, ratios: {...newRecipe.ratios, [c.id]: parseFloat(e.target.value)}})} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center font-bold text-xs uppercase text-slate-400">Przyprawy (g / kg) <button onClick={() => setNewRecipe({...newRecipe, spices: [...newRecipe.spices, {id: Date.now(), name: '', ratio: 0}]})} className="bg-slate-800 text-white px-3 py-1 rounded-lg">+ Dodaj</button></div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {newRecipe.spices.map((s, idx) => (
                      <div key={s.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border">
                        <input className="flex-1 bg-transparent text-sm font-bold" placeholder="Nazwa..." value={s.name} onChange={e => { const u = [...newRecipe.spices]; u[idx].name = e.target.value; setNewRecipe({...newRecipe, spices: u}); }} />
                        <input type="number" className="w-16 border rounded p-1 text-center font-bold" value={s.ratio} onChange={e => { const u = [...newRecipe.spices]; u[idx].ratio = parseFloat(e.target.value) || 0; setNewRecipe({...newRecipe, spices: u}); }} />
                        <button onClick={() => setNewRecipe({...newRecipe, spices: newRecipe.spices.filter(sp => sp.id !== s.id)})} className="text-red-300"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleSaveToDB} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><Save /> {newRecipe.id ? 'ZAKTUALIZUJ' : 'ZAPISZ NOWĄ'}</button>
                  {newRecipe.id && <button onClick={() => setNewRecipe({name: '', description: '', ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 }, spices: [{id: Date.now(), name: 'Sól', ratio: 18}]})} className="w-full text-slate-400 text-sm">Anuluj edycję</button>}
                </div>
              </div>
            </div>

            {/* LISTA ISTNIEJĄCYCH RECEPTUR */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl">
              <h3 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-sm">Baza Twoich Receptur</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(recipes).map(r => (
                  <div key={r.id} className="p-4 border-2 border-slate-50 rounded-2xl flex justify-between items-center hover:border-slate-100 transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-xs">{r.name}</p>
                      <p className="text-[10px] text-slate-400 truncate w-40">{r.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(r)} className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 shadow-xl no-print">
              <div className="bg-slate-800 p-8 rounded-[2rem] mb-8">
                <label className="block text-slate-400 text-xs font-black uppercase mb-3">Masa Mięsa (KG)</label>
                <input type="number" title="Masa" className="w-full bg-transparent text-white text-6xl font-black outline-none" placeholder="0.0" onChange={e => setTotalTarget(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-4">
                {meatClasses.map(cls => (
                  <div key={cls.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-transparent">
                    <div className="flex items-center gap-4"><span className="text-3xl bg-white p-2 rounded-xl shadow-sm">{cls.icon}</span><div><span className="font-black text-slate-800 uppercase text-sm">{cls.label}</span><p className="text-[10px] text-slate-400 font-bold uppercase">Sugerowane: {(totalTarget * (recipe.ratios?.[cls.id] || 0)).toFixed(2)} kg</p></div></div>
                    <input type="number" title={cls.label} className="w-32 border-2 border-slate-200 rounded-xl py-3 px-4 text-right font-black text-xl text-slate-700" value={classWeights[cls.id] || ''} onChange={e => setClassWeights({...classWeights, [cls.id]: parseFloat(e.target.value) || 0})} />
                  </div>
                ))}
              </div>
              <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white flex justify-between items-center">
                <span className="font-bold text-slate-500 uppercase text-xs">SUMA RZECZYWISTA:</span>
                <span className="text-4xl font-black">{currentTotal} kg</span>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="font-black flex items-center gap-3 text-slate-800 uppercase"><Beaker className="text-blue-500" /> Karta Wyrobu</h2>
                <button onClick={() => window.print()} className="bg-slate-100 p-3 rounded-xl"><Download size={20} /></button>
              </div>
              <div className="print-only text-center mb-8"><h1 className="text-3xl font-black uppercase">{recipe.name}</h1></div>
              {calculatedSpices ? (
                <div className="space-y-4">
                  <div className="p-6 bg-blue-50 rounded-3xl border-l-8 border-blue-500 mb-6">
                    <h3 className="font-black text-xl text-blue-900 uppercase mb-2">{recipe.name}</h3>
                    <p className="text-sm text-blue-700 leading-relaxed"><FileText size={16} className="inline mr-2" />{recipe.description || "Brak instrukcji."}</p>
                  </div>
                  <div className="space-y-2">
                    {calculatedSpices.map(s => (
                      <div key={s.id} className={`flex justify-between items-center p-4 rounded-xl border-2 ${s.id === 'salt' || s.name.toLowerCase().includes('sól') ? 'bg-slate-800 text-white border-slate-900 shadow-md' : 'bg-white border-slate-50'}`}>
                        <span className="font-bold uppercase text-xs">{s.name}</span>
                        <div className="flex items-baseline gap-1"><span className="font-black text-xl">{s.amount}</span><span className="text-xs opacity-40">g</span></div>
                      </div>
                    ))}
                  </div>
                  <textarea className="w-full mt-6 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-32 no-print text-sm italic" placeholder="Notatki do sesji..." value={recipeNotes} onChange={e => setRecipeNotes(e.target.value)} />
                </div>
              ) : (
                <div className="text-center text-slate-200 py-32"><Calculator size={60} className="mx-auto mb-4 opacity-10" /><p className="font-black uppercase tracking-widest text-xs">Podaj masę mięsa po lewej</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
