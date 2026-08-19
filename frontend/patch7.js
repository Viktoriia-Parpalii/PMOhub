const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectModal.tsx', 'utf8');

// Hide the "Продовжити на наступний період" and "В портфель"/"В беклог" for Backlog items
code = code.replace(
  /{!isReadOnly && project && \(\s*<>\s*<button/g,
  '{!isReadOnly && project && !isBacklog && (\n              <>\n                <button'
);

fs.writeFileSync('src/components/ProjectModal.tsx', code);
