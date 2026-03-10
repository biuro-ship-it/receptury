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
      alert("Receptura zapisana!");
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
              <h1 className="
