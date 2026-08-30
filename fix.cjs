const fs = require('fs');
let data = fs.readFileSync('schema.sql', 'utf8');
data = data.replace(/CREATE POLICY "([^"]+)" ON (public\.[a-zA-Z_]+)/g, 'DROP POLICY IF EXISTS "$1" ON $2;\nCREATE POLICY "$1" ON $2');
fs.writeFileSync('schema.sql', data);
