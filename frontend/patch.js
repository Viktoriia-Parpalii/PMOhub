const fs = require('fs');
let code = fs.readFileSync('src/components/AdminTab.tsx', 'utf8');

// 1. Update useAppContext to get initiativeSizes methods
code = code.replace(
  'taskWeights, addTaskWeight, updateTaskWeight, deleteTaskWeight } = useAppContext();',
  'taskWeights, addTaskWeight, updateTaskWeight, deleteTaskWeight, initiativeSizes, addInitiativeSize, updateInitiativeSize, deleteInitiativeSize } = useAppContext();'
);

// 2. Add state for Initiative Sizes
code = code.replace(
  'const [newSizeWeight, setNewSizeWeight] = useState(1);',
  `const [newSizeWeight, setNewSizeWeight] = useState(1);
  const [newInitSizeName, setNewInitSizeName] = useState('');
  const [newInitSizeMin, setNewInitSizeMin] = useState(0);
  const [newInitSizeMax, setNewInitSizeMax] = useState(1);`
);

// 3. Add handler for Initiative Sizes and fix addTaskWeight
code = code.replace(
  /const handleAddSize = \(\) => \{\n    if \(newSizeName\.trim\(\)\) \{\n      addTaskWeight\(\{ id: 'S' \+ Date\.now\(\), name: newSizeName, weight: newSizeWeight, is_active: true \}\);\n      setNewSizeName\(''\); setNewSizeWeight\(1\);\n    \}\n  \};/g,
  `const handleAddTaskWeight = () => {
    if (newSizeName.trim()) {
      addTaskWeight({ id: 'TW' + Date.now(), name: newSizeName, weight: newSizeWeight, is_active: true });
      setNewSizeName(''); setNewSizeWeight(1);
    }
  };

  const handleAddInitSize = () => {
    if (newInitSizeName.trim()) {
      addInitiativeSize({ id: 'IS' + Date.now(), name: newInitSizeName, min_score: newInitSizeMin, max_score: newInitSizeMax, is_active: true });
      setNewInitSizeName(''); setNewInitSizeMin(0); setNewInitSizeMax(1);
    }
  };`
);

// 4. Update the Task Weight section title and input handlers
code = code.replace(
  /<h2 className="text-lg font-bold text-slate-800">Розміри<\/h2>/g,
  '<h2 className="text-lg font-bold text-slate-800">Розмір (вага) завдання</h2>'
);

code = code.replace(
  /<button onClick=\{handleAddSize\}/g,
  '<button onClick={handleAddTaskWeight}'
);

fs.writeFileSync('src/components/AdminTab.tsx', code);
