const fs = require('fs');

// 1. types.ts
let types = fs.readFileSync('src/types.ts', 'utf8');
types = types.replace(/implementer_dept_id:\s*string;/g, 'implementer_dept_ids: string[];');
fs.writeFileSync('src/types.ts', types);

// 2. data.ts
let data = fs.readFileSync('src/data.ts', 'utf8');
// regex to replace implementer_dept_id: 'D1' with implementer_dept_ids: ['D1']
data = data.replace(/implementer_dept_id:\s*'([^']+)'/g, "implementer_dept_ids: ['$1']");
fs.writeFileSync('src/data.ts', data);

console.log('Types and Data patched');
