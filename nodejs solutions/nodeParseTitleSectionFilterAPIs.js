const fs = require('fs');
const axios = require('axios');

 
const chooseTitle = 'title-14';   
const API_URL = `https://www.ecfr.gov/api/versioner/v1/structure/current/${chooseTitle}.json`;

async function fetchAndParse() {
  try {
    const response = await axios.get(API_URL);
    const jsonData = response.data;

    console.log(response,jsonData)
    const sections = extractSections(jsonData);
    const structuredSections = sections.map(splitPathStructure);

    console.log(structuredSections)
    const outputFile = `${chooseTitle}-structured_sections.json`;
    fs.writeFileSync(outputFile, JSON.stringify(structuredSections, null, 2));
    console.log(`${structuredSections.length} sections saved to ${outputFile}`);
  } catch (err) {
    console.error('Error fetching data:', err.message);
  }
}

// Recursive
function extractSections(obj, pathStack = []) {
  const results = [];
  const currentLabel = obj.label || obj.label_level || obj.identifier || 'unknown';
  const fullPath = [...pathStack, currentLabel];

  console.log(currentLabel)
  if (obj.type === 'section') {
    results.push({
      path: fullPath.join(' > '),
      identifier: obj.identifier || null,
      label: obj.label || null,
      description: obj.label_description || null,
      size: obj.size || null,
      received_on: obj.received_on || null
    });
  }

  if (Array.isArray(obj.children)) {
    for (const child of obj.children) {
      results.push(...extractSections(child, fullPath));
    }
  }

  return results;
}

// Path splitter
function splitPathStructure(section) {
  const levels = section.path.split(' > ');
  return {
    title: levels[0] || null,
    chapter: levels[1] || null,
    subchapter: levels[2] || null,
    part: levels[3] || null,
    subpart: levels[4] || null,
    section: levels[5] || null,
    identifier: section.identifier,
    description: section.description,
    size: section.size,
    received_on: section.received_on
  };
}
fetchAndParse();
