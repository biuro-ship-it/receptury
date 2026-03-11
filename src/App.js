import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { 
  Scale, Beaker, Calculator, Settings, X, Lock, Unlock, 
  KeyRound, Download, Plus, Trash2, Save, FileText, Edit3, Flame, Zap, Disc, ChevronRight
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
  
  // ADMIN STATE
  const [compositionMode, setCompositionMode] = useState('percent'); // 'percent' | 'weight'
  const [weightInputs, setWeightInputs] = useState({ class1: 0, class2: 0, class3: 0, class4: 0 });
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
      if (!selectedKey && Object.keys(dbRecipes).length > 0) {
        setSelectedKey(Object.keys(dbRecipes)[0]);
      }
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

  const currentTotal = useMemo(() => 
    Object.values(classWeights).reduce((a, b) => a + b, 0).toFixed(2)
  , [classWeights]);

  const calculatedSpices = useMemo(() => {
    if (currentTotal <= 0 || !recipe) return null;
    return recipe.spices.map(s => ({ ...s, amount: (currentTotal * s.ratio).toFixed(1) }));
  }, [currentTotal, recipe]);

  const totalMeatPercent = useMemo(() => 
    Math.round(Object.values(newRecipe.ratios).reduce((a, b) => a + b, 0) * 100)
  , [newRecipe.ratios]);

  // FUNKCJA: KONWERSJA WAGI NA %
  const convertWeightsToRatios = () => {
    const total = Object.values(weightInputs).reduce((a, b) => a + b, 0);
    if (total <= 0) {
      alert("Wpisz wagi mięsa!");
      return;
    }
    const newRatios = {};
    meatClasses.forEach(c => {
      newRatios[c.id] = parseFloat((weightInputs[c.id] / total).toFixed(4));
    });
    setNewRecipe({ ...newRecipe, ratios: newRatios });
    setCompositionMode('percent'); // Po przeliczeniu wracamy do widoku %
    alert("Przeliczono na procenty!");
  };

  const handleSaveToDB = async () => {
    if (!newRecipe.name) { alert("Podaj nazwę!"); return; }
    if (totalMeatPercent !== 100) { alert("Suma musi wynosić dokładnie 100%!"); return; }
    
    const id = newRecipe.id || newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'recipes', id), { ...newRecipe, id });
      setIsAdmin(false);
      alert("Receptura zapisana!");
    } catch (e) { alert("Błąd zapisu!"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="bg-slate-900 text-white rounded-3xl p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl no-print">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl"><Scale size={30} /></div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Masarski Master</h1>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-slate-800 border-none text-white rounded-xl py-2 px-4 font-bold" value={selectedKey} onChange={e => setSelectedKey(e.target.value)}>
              {Object.values(recipes).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={() => setIsAuthModalOpen(true)} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700">
              {isAdmin ? <Unlock size={20} className="text-amber-400" /> : <Lock size={20} />}
            </button>
          </div>
        </header>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
              <KeyRound className="mx-auto mb-4 text-blue-600" size={40} />
              <input type="password" title="Hasło" className="w-full border-2 p-4 rounded-xl text-center text-xl font-bold mb-4 outline-none focus:border-blue-500" placeholder="Hasło (admin123)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && passwordInput === 'admin123' && (setIsAdmin(true) || setIsAuthModalOpen(false))} />
              <button type="button" onClick={() => passwordInput === 'admin123' && (setIsAdmin(true) || setIsAuthModalOpen(false))} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700">WEJDŹ</button>
              <button type="button" onClick={() => setIsAuthModalOpen(false)} className="w-full mt-2 text-slate-400 text-xs font-bold uppercase tracking-widest">Anuluj</button>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border-t-[12px] border-amber-400 no-print space-y-10">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Settings className="text-amber-500" /> Edytor Receptur</h2>
              <button onClick={() => setIsAdmin(false)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><X size={32} /></button>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nazwa produktu</label>
                  <input type="text" className="w-full border-2 border-slate-100 rounded-2xl p-5 text-xl font-black focus:border-blue-500 outline-none" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} placeholder="Np. Kiełbasa Krakowska" />
                </div>
                
                <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                  {/* PRZEŁĄCZNIK TRYBU */}
                  <div className="flex bg-slate-200 p-1 rounded-2xl mb-6">
                    <button 
                        type="button"
                        onClick={() => setCompositionMode('percent')} 
                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${compositionMode === 'percent' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >Skład %</button>
                    <button 
                        type="button"
                        onClick={() => setCompositionMode('weight')} 
                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${compositionMode === 'weight' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >Skład wagowy (kg)</button>
                  </div>

                  <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <span className={`font-black text-xl ${totalMeatPercent === 100 ? 'text-green-600' : 'text-amber-600'}`}>Suma: {totalMeatPercent}%</span>
                    {compositionMode === 'weight' && (
                        <button type="button" onClick={convertWeightsToRatios} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700">Przelicz na %</button>
                    )}
                  </div>

                  {meatClasses.map(c => (
                    <div key={c.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 items-center">
                      <p className="font-black text-[11px] uppercase text-slate-500">{c.label}</p>
                      {compositionMode === 'percent' ? (
                        <div className="flex items-center gap-3">
                           <input type="range" min="0" max="1" step="0.01" className="flex-1 accent-blue-600" value={newRecipe.ratios[c.id]} onChange={e => setNewRecipe({...newRecipe, ratios: {...newRecipe.ratios, [c.id]: parseFloat(e.target.value)}})} />
                           <span className="text-sm font-black w-10 text-right">{(newRecipe.ratios[c.id]*100).toFixed(0)}%</span>
                        </div>
                      ) : (
                        <div className="relative">
                            <input type="number" className="w-full border-2 border-white p-3 rounded-xl font-black text-blue-600 outline-none focus:border-blue-400" value={weightInputs[c.id]} onChange={e => setWeightInputs({...weightInputs, [c.id]: parseFloat(e.target.value) || 0})} />
                            <span className="absolute right-3 top-3 text-[10px] font-black text-slate-300">KG</span>
                        </div>
                      )}
                      <div className="col-span-2 relative">
                         <Disc size={12} className="absolute left-3 top-3.5 text-slate-300" />
                         <input type="text" className="w-full border-2 border-white p-2.5 pl-9 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-amber-400" placeholder="Sito (np. szarpak)" value={newRecipe.grinding?.[c.id] || ''} onChange={e => setNewRecipe({...newRecipe, grinding: {...newRecipe.grinding, [c.id]: e.target.value}})} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Procedura i wędzenie</label>
                  <textarea className="w-full border-2 border-slate-100 rounded-2xl p-5 h-32 text-sm outline-none focus:border-blue-500" value={newRecipe.description} onChange={e => setNewRecipe({...newRecipe, description: e.target.value})} placeholder="Np. Osadzanie 2h, wędzenie 3h w 55st..." />
                </div>
                
                <div className="space-y-3 bg-slate-50 p-6 rounded-3xl">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Receptura przypraw (g/kg)</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {newRecipe.spices.map((s, idx) => (
                      <div key={s.id} className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                        <input className="flex-1 text-xs font-black uppercase outline-none px-2" value={s.name} placeholder="Składnik..." onChange={e => { const u = [...newRecipe.spices]; u[idx].name = e.target.value; setNewRecipe({...newRecipe, spices: u}); }} />
                        <input type="number" className="w-16 border rounded-lg p-1 text-center font-black text-blue-600" value={s.ratio} onChange={e => { const u = [...newRecipe.spices]; u[idx].ratio = parseFloat(e.target.value) || 0; setNewRecipe({...newRecipe, spices: u}); }} />
                        <button type="button" onClick={() => setNewRecipe({...newRecipe, spices: newRecipe.spices.filter(sp => sp.id !== s.id)})} className="text-red-300 p-1 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setNewRecipe({...newRecipe, spices: [...newRecipe.spices, {id:Date.now(), name:'', ratio:0}]})} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all">+ DODAJ SKŁADNIK</button>
                </div>
                
                <button 
                  type="button"
                  onClick={handleSaveToDB} 
                  disabled={totalMeatPercent !== 100}
                  className={`w-full py-6 rounded-[2rem] font-black shadow-xl transition-all uppercase tracking-[0.2em] text-sm ${totalMeatPercent === 100 ? 'bg-blue-600 text-white hover:bg-blue-700 scale-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed scale-95'}`}
                >
                  <Save className="inline-block mr-2" /> {newRecipe.id ? 'Zaktualizuj' : 'Zapisz nową'} recepturę
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10">
            {/* KALKULATOR */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border-t-[12px] border-blue-600 relative overflow-hidden">
                <div className="bg-slate-900 p-12 rounded-[2.5rem] mb-12 text-white shadow-2xl relative z-10">
                  <label className="block text-blue-400 text-[11px] font-black uppercase tracking-[0.4em] mb-6">Waga Surowca (KG)</label>
                  <input type="number" className="w-full bg-transparent text-8xl font-black outline-none placeholder:text-slate-800" placeholder="0.0" onChange={e => setTotalTarget(parseFloat(e.target.value) || 0)} />
                  <Zap className="absolute -right-16 -bottom-16 text-white/5" size={300} />
                </div>
                <div className="space-y-4">
                  {meatClasses.map(cls => (
                    <div key={cls.id} className="p-6 bg-slate-50/50 rounded-[2rem] border-2 border-transparent hover:border-blue-100 flex justify-between items-center transition-all">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl bg-white p-3 rounded-2xl shadow-sm">{cls.icon}</span>
                        <div>
                          <span className="font-black text-slate-800 uppercase text-sm block mb-1">{cls.label}</span>
                          <div className="flex gap-2">
                             <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Sugerowane: {(totalTarget * (recipe?.ratios?.[cls.id] || 0)).toFixed(2)} kg</span>
                             {recipe?.grinding?.[cls.id] && <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded uppercase">Sito: {recipe.grinding[cls.id]}</span>}
                          </div>
                        </div>
                      </div>
                      <input type="number" className="w-32 border-2 border-slate-100 rounded-2xl py-3 px-4 text-right font-black text-2xl text-slate-700" value={classWeights[cls.id] || ''} onChange={e => setClassWeights({...classWeights, [cls.id]: parseFloat(e.target.value) || 0})} />
                    </div>
                  ))}
                </div>
                <div className="mt-12 p-10 bg-blue-600 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl">
                  <span className="font-black uppercase text-[11px] tracking-[0.3em] opacity-60">Suma Farszu</span>
                  <span className="text-6xl font-black">{currentTotal} <span className="text-2xl opacity-40 uppercase">kg</span></span>
                </div>
              </div>
            </div>

            {/* KARTA PRZEPISU */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl sticky top-8 border-t-[12px] border-slate-900 border-b-8">
                <div className="flex justify-between items-center mb-10 no-print border-b pb-8">
                  <h2 className="font-black text-slate-900 uppercase text-lg flex items-center gap-2 tracking-tighter"><FileText className="text-blue-600" /> Pobierz przepis</h2>
                  <button onClick={() => window.print()} className="bg-slate-900 text-white p-4 pr-5 rounded-[1.5rem] hover:bg-blue-600 transition-all shadow-xl active:scale-95 flex items-center gap-2">
                    <Download size={22} /><ChevronRight size={20} className="text-slate-500" />
                  </button>
                </div>

                {calculatedSpices ? (
                  <div className="space-y-8">
                    <div className="p-8 bg-blue-50 rounded-[2.5rem] border-l-[16px] border-blue-600 shadow-sm relative overflow-hidden">
                      <h3 className="font-black text-3xl text-blue-900 uppercase mb-4 tracking-tighter leading-none">{recipe?.name}</h3>
                      <p className="text-xs text-blue-700 leading-relaxed italic opacity-80 mb-6">"{recipe?.description}"</p>
                      
                      <div className="space-y-2 bg-white/60 p-5 rounded-2xl border border-blue-100">
                        <h4 className="text-[9px] font-black uppercase text-blue-300 tracking-widest mb-2 border-b border-blue-50 pb-2 italic">Instrukcja Mielenia:</h4>
                        {meatClasses.map(cls => (
                           recipe.grinding?.[cls.id] && (
                             <div key={cls.id} className="flex justify-between text-[11px] font-black uppercase text-blue-900">
                               <span className="opacity-40">{cls.label}:</span>
                               <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px]">SITO {recipe.grinding[cls.id]}</span>
                             </div>
