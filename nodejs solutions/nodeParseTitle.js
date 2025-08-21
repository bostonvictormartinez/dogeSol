const fs = require('fs');
const path = require('path');

// JSON FROM TITLE-2
const jsonPath = path.join(__dirname, 'title-2.json'); 
console.log(`JSON: ${jsonPath}`);

const raw = fs.readFileSync(jsonPath);
const data = JSON.parse(raw);

// values
function extractKeys(obj, prefix = '') {
  const results = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.log(`object: ${fullKey}`);
        results.push(...extractKeys(value, fullKey)); // Recurse
    } else {
      results.push({ key: fullKey, value });
      console.log(`key: ${fullKey} value: ${JSON.stringify(value)}`);
    }
  }

  return results;
}

// extraction
const output = extractKeys(data);

// save output
output.forEach(({ key, value }) => {
  console.log(`${key}: ${JSON.stringify(value)}`);
});
