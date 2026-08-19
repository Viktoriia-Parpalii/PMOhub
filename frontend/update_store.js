const fs = require('fs');
let content = fs.readFileSync('src/store.tsx', 'utf8');

content = content.replace(
  '  users: User[];',
  '  users: User[];\n  addUser: (u: User) => void;\n  updateUser: (id: string, u: Partial<User>) => void;\n  deleteUser: (id: string) => void;'
);

content = content.replace(
  'const [users] = useState<User[]>(initialUsers);',
  'const [users, setUsers] = useState<User[]>(initialUsers);'
);

const beforeAddProject = '  const addProject = (p: Project) => setProjects(prev => [...prev, p]);';
content = content.replace(
  beforeAddProject,
  '  const addUser = (u: User) => setUsers(prev => [...prev, u]);\n  const updateUser = (id: string, u: Partial<User>) => setUsers(prev => prev.map(user => user.id === id ? { ...user, ...u } : user));\n  const deleteUser = (id: string) => setUsers(prev => prev.filter(user => user.id !== id));\n\n' + beforeAddProject
);

content = content.replace(
  'users, currentUser, login, logout,',
  'users, currentUser, login, logout, addUser, updateUser, deleteUser,'
);

fs.writeFileSync('src/store.tsx', content);
