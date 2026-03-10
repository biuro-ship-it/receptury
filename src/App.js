import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc 
} from 'firebase/firestore';
import { 
  Scale, Beaker, Calculator, Settings, X, Lock, Unlock, 
  KeyRound, Download, Plus, Trash2, Save, FileText, Edit3, Flame, Thermometer, Zap, Disc
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

  // Kiedy zmienia się przepis, ładujemy domyślne siatki do sesji
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

  const handleSaveToDB = async () => {
    if (!newRecipe.name) return;
    const id = newRecipe.id || newRecipe.name.toLowerCase().replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'recipes', id), { ...newRecipe, id });
      setNewRecipe({ name: '', description: '', ratios: { class1: 0.25, class2: 0.25, class3: 0.25, class4: 0.25 }, grinding: {}, smoking: {}, spices: [{ id: Date.now(), name: 'Sól', ratio: 18 }] });
      alert("Receptura zapisana w bazie danych!");
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
            <div className="bg-blue-600 p-3 rounded-2xl"><Scale size={30} /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">Masarski <span className="text-blue-400">Log</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Profesjonalna Karta Technologiczna</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-slate-800 border-2 border-slate-700 text-white rounded-xl py-2 px-4 font-bold outline-none focus:border-blue-500" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
              {Object.entries(recipes).map(([key, r]) => (<option key={key} value={key}>{r.name}</option>))}
            </select>
            <button onClick={() => setIsAuthModalOpen(true)} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 border border-slate-700 transition-colors">
              {isAdmin ? <Unlock size={20} className="text-amber-400" /> : <Lock size={20} />}
            </button>
          </div>
        </header>

        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
              <KeyRound className="mx-auto mb-4 text-blue-600" size={40} />
              <h3 className="font-black mb-6 uppercase tracking-widest text-sm">Autoryzacja Admina</h3>
              <input type="password" title="Hasło" className="w-full border-2 border-slate-100 rounded-xl p-4 text-center text-xl font-bold mb-6 focus:border-blue-500 outline-none" placeholder="Hasło..." value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (passwordInput === 'admin123' ? setIsAdmin(true) || setIsAuthModalOpen(false) : null)} />
              <button onClick={() => { if(passwordInput === 'admin123') { setIsAdmin(true); setIsAuthModalOpen(false); } }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all">ZALOGUJ</button>
              <button onClick={() => setIsAuthModalOpen(false)} className="w-full text-slate-400 mt-4 text-xs font-bold uppercase">Zamknij</button>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-6 no-print">
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border-t-8 border-amber-400">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Settings /> Kreator Receptury (Baza)</h2>
                <button onClick={() => setIsAdmin(false)} className="p-2 hover:bg-red-50 rounded-full text-red-500"><X size={32} /></button>
              </div>
              <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase">Dane Receptury</label>
                    <input type="text" className="w-full border-2 border-slate-50 rounded-2xl p-4 text-xl font-bold bg-slate-50" value={newRecipe.name} onChange={e => setNewRecipe({...newRecipe, name: e.target.value})} placeholder="Nazwa wyrobu..." />
                    <textarea className="w-full border-2 border-slate-50 rounded-2xl p-4 h-24 text-sm bg-slate-50" value={newRecipe.description} onChange={e => setNewRecipe({...newRecipe, description: e.target.value})} placeholder="Opis lub historia..." />
                  </div>
                  
                  <div className="p-6 bg-slate-50 rounded-3xl">
                    <h3 className="font-black text-slate-400 mb-6 uppercase text-[10px] tracking-widest">Rekomendowane Mielenie i Skład (%)</h3>
                    {meatClasses.map(c => (
                      <div key={c.id} className="grid grid-cols-2 gap-4 mb-6 items-center">
                        <div>
                          <p className="font-bold text-xs mb-1">{c.label} ({(newRecipe.ratios[c.id] * 100).toFixed(0)}%)</p>
                          <input type="range" min="0" max="1" step="0.05" className="w-full h-1 bg-slate-200 rounded-lg appearance-none accent-blue-600" value={newRecipe.ratios[c.id]} onChange={e => setNewRecipe({...newRecipe, ratios: {...newRecipe.ratios, [c.id]: parseFloat(e.target.value)}})} />
                        </div>
                        <input type="text" className="border-2 border-white rounded-xl p-2 text-xs font-bold shadow-sm" placeholder="Siatka bazowa (np. 8mm)" value={newRecipe.grinding?.[c.id] || ''} onChange={e => setNewRecipe({...newRecipe, grinding: {...newRecipe.grinding, [c.id]: e.target.value}})} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-blue-900 text-white rounded-3xl shadow-lg">
                    <h3 className="font-black mb-6 uppercase text-[10px] tracking-widest opacity-50">Domyślna Obróbka</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-bold block mb-1">DREWNO</label><input className="w-full bg-blue-800 border-none rounded-xl p-3 text-sm font-bold" value={newRecipe.smoking?.wood || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, wood: e.target.value}})} /></div>
                      <div><label className="text-[10px] font-bold block mb-1">OSUSZANIE</label><input className="w-full bg-blue-800 border-none rounded-xl p-3 text-sm font-bold" value={newRecipe.smoking?.drying || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, drying: e.target.value}})} /></div>
                      <div><label className="text-[10px] font-bold block mb-1">TEMP. WĘDZENIA</label><input className="w-full bg-blue-800 border-none rounded-xl p-3 text-sm font-bold" value={newRecipe.smoking?.temp || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, temp: e.target.value}})} /></div>
                      <div><label className="text-[10px] font-bold block mb-1">CZAS WĘDZENIA</label><input className="w-full bg-blue-800 border-none rounded-xl p-3 text-sm font-bold" value={newRecipe.smoking?.time || ''} onChange={e => setNewRecipe({...newRecipe, smoking: {...newRecipe.smoking, time: e.target.value}})} /></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><label className="text-xs font-black uppercase text-slate-400">Przyprawy (g / kg)</label> <button onClick={() => setNewRecipe({...newRecipe, spices: [...newRecipe.spices, {id: Date.now(), name: '', ratio: 0}]})} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold">+ Dodaj</button></div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {newRecipe.spices.map((s, idx) => (
                        <div key={s.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border-2 border-slate-50">
                          <input className="flex-1 text-sm font-bold outline-none" placeholder="Nazwa..." value={s.name} onChange={e => { const u = [...newRecipe.spices]; u[idx].name = e.target.value; setNewRecipe({...newRecipe, spices: u}); }} />
                          <input type="number" className="w-16 border rounded-lg p-1 text-center font-bold" value={s.ratio} onChange={e => { const u = [...newRecipe.spices]; u[idx].ratio = parseFloat(e.target.value) || 0; setNewRecipe({...newRecipe, spices: u}); }} />
                          <button onClick={() => setNewRecipe({...newRecipe, spices: newRecipe.spices.filter(sp => sp.id !== s.id)})} className="text-red-200"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSaveToDB} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 flex items-center justify-center gap-3"><Save /> ZAPISZ W BAZIE</button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <h3 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-xs border-b pb-4">Wszystkie Receptury ({Object.keys(recipes).length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.values(recipes).map(r => (
                  <div key={r.id} className="p-5 border-2 border-slate-50 rounded-2xl hover:border-blue-100 flex flex-col justify-between group">
                    <p className="font-black text-slate-800 uppercase text-xs mb-4">{r.name}</p>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setNewRecipe(r); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Edit3 size={16} /></button>
                      <button onClick={async () => { if(window.confirm("Usunąć recepturę z bazy?")) await deleteDoc(doc(db, 'recipes', r.id)); }} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* LEWA STRONA: KALKULACJA SESJI */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border-t-8 border-blue-600">
                <div className="bg-slate-900 p-10 rounded-[2rem] mb-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <label className="block text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Waga mięsa do przygotowania (KG)</label>
                    <input type="number" className="w-full bg-transparent text-7xl font-black outline-none" placeholder="0.0" onChange={e => setTotalTarget(parseFloat(e.target.value) || 0)} />
                  </div>
                  <Zap className="absolute -right-10 -bottom-10 text-white/5" size={250} />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-6">
                    <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Klasyfikacja & Mielenie w tej sesji</h3>
                    <span className="text-[10px] font-bold text-slate-300 italic">Możesz zmienić siatki mielenia poniżej</span>
                  </div>
                  
                  {meatClasses.map(cls => (
                    <div key={cls.id} className="p-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-blue-100 transition-all">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-4xl bg-white p-3 rounded-2xl shadow-sm">{cls.icon}</span>
                          <div className="flex-1">
                            <span className="font-black text-slate-800 uppercase text-sm leading-none block mb-2">{cls.label}</span>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md uppercase">Sugerowane: {(totalTarget * (recipe.ratios?.[cls.id] || 0)).toFixed(2)} kg</span>
                                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">
                                    <Disc size={10} />
                                    <span className="text-[10px] font-black uppercase">Siatka:</span>
                                    <input 
                                        type="text" 
                                        className="bg-transparent border-none p-0 text-[10px] font-black w-16 outline-none focus:text-blue-600"
                                        value={sessionGrinding[cls.id] || ''}
                                        onChange={e => setSessionGrinding({...sessionGrinding, [cls.id]: e.target.value})}
                                    />
                                </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Waga (kg)</label>
                            <input type="number" className="w-28 border-2 border-slate-200 rounded-xl py-3 px-4 text-right font-black text-xl text-slate-700 bg-white focus:border-blue-500 outline-none" value={classWeights[cls.id] || ''} onChange={e => setClassWeights({...classWeights, [cls.id]: parseFloat(e.target.value) || 0})} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 p-10 bg-blue-600 rounded-[2rem] text-white flex justify-between items-center shadow-xl">
                  <div>
                    <span className="font-black uppercase text-[10px] tracking-widest opacity-60 block mb-1">Faktyczna suma mięsa (FARSZ)</span>
                    <p className="text-xs font-bold text-blue-200 italic">Na tej podstawie wyliczamy przyprawy</p>
                  </div>
                  <span className="text-5xl font-black">{currentTotal} <span className="text-xl">kg</span></span>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border-t-8 border-amber-500 no-print">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><Flame size={24} /></div>
                  <h3 className="font-black text-xl uppercase tracking-tight">Parametry tej partii</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Waga gotowej kiełbasy (kg)</label>
                    <input type="number" className="w-full border-2 border-slate-100 rounded-2xl p-4 text-2xl font-black text-amber-600 outline-none focus:border-amber-500" placeholder="0.0" onChange={e => setFinalWeight(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="bg-amber-50 p-6 rounded-2xl flex items-center justify-between border border-amber-100">
                    <span className="font-black text-amber-800 text-xs tracking-widest">WYDAJNOŚĆ:</span>
                    <span className="text-4xl font-black text-amber-600">{yieldValue ? `${yieldValue}%` : '--'}</span>
                  </div>
                </div>
                <textarea className="w-full border-2 border-slate-100 rounded-2xl p-5 h-32 text-sm italic bg-slate-50 focus:bg-white transition-all outline-none" placeholder="Notatki z sesji (np. temperatura osuszania, rodzaj użytego drewna)..." value={smokingNotes} onChange={e => setSmokingNotes(e.target.value)} />
              </div>
            </div>

            {/* PRAWA STRONA: PODGLĄD KARTY DO DRUKU */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl sticky top-8 border-t-8 border-slate-900">
                <div className="flex justify-between items-center mb-10 no-print">
                  <h2 className="font-black flex items-center gap-3 text-slate-800 uppercase tracking-tighter"><FileText className="text-blue-600" /> Karta Partii</h2>
                  <button onClick={() => window.print()} className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-blue-600 transition-all shadow-lg"><Download size={24} /></button>
                </div>

                <div className="print-only text-center mb-10 border-b-8 border-slate-900 pb-8">
                  <h1 className="text-5xl font-black uppercase mb-2">{recipe.name}</h1>
                  <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">Data sesji: {new Date().toLocaleDateString()}</p>
                </div>

                {calculatedSpices ? (
                  <div className="space-y-6">
                    <div className="p-8 bg-blue-50 rounded-[2rem] border-l-[12px] border-blue-600 mb-8">
                      <h3 className="font-black text-2xl text-blue-900 uppercase mb-2">{recipe.name}</h3>
                      <p className="text-xs text-blue-700 leading-relaxed font-bold italic mb-6">"{recipe.description}"</p>
                      
                      <div className="grid grid-cols-1 gap-3 pt-4 border-t border-blue-200">
                        {meatClasses.map(cls => (
                           sessionGrinding[cls.id] && (
                             <div key={cls.id} className="flex justify-between text-[10px] font-black uppercase text-blue-900 bg-white/50 px-3 py-1 rounded-md">
                               <span>{cls.label}:</span>
                               <span>Siatka {sessionGrinding[cls.id]}</span>
                             </div>
                           )
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Wykaz Przypraw i Dodatków</h4>
                      {calculatedSpices.map(s => (
                        <div key={s.id} className={`flex justify-between items-center p-5 rounded-2xl border-2 ${s.id === 'salt' || s.name.toLowerCase().includes('sól') ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-50'}`}>
                          <span className="font-black uppercase text-[10px] tracking-wider">{s.name}</span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-black text-3xl">{s.amount}</span>
                            <span className="text-xs font-bold opacity-40">g</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="print-only mt-10 p-8 bg-slate-50 rounded-3xl border-2 border-slate-200">
                        <h4 className="font-black text-xs uppercase mb-4 tracking-tighter">PARAMETRY OBRÓBKI & UWAGI:</h4>
                        <div className="grid grid-cols-2 gap-y-2 mb-4 text-[10px] font-bold border-b pb-4">
                            <span>DREWNO: {recipe.smoking?.wood || '--'}</span>
                            <span>TEMP: {recipe.smoking?.temp || '--'}</span>
                            <span>CZAS: {recipe.smoking?.time || '--'}</span>
                            <span>OSUSZANIE: {recipe.smoking?.drying || '--'}</span>
                        </div>
                        <p className="text-[10px] italic text-slate-600 mt-4 leading-relaxed">{smokingNotes || "Brak uwag technicznych."}</p>
                        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-[10px] font-black text-slate-400 uppercase">
                            <span>Wydajność: {yieldValue || '--'}%</span>
                            <span>Masa farszu: {currentTotal} kg</span>
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-200 py-32"><Calculator size={100} className="mx-auto mb-6 opacity-5" /><p className="font-black uppercase tracking-[0.3em] text-[10px]">Wpisz masę mięsa po lewej</p></div>
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
