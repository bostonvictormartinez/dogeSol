
    // Firebase config
    const firebaseConfig = {
        apiKey: " ",
        authDomain: "dogevictor.firebaseapp.com",
        projectId: "dogevictor",
        databaseURL: " ",
        storageBucket: "dogevictor.firebasestorage.app",
        messagingSenderId: " ",
        appId: "1:868602250648:web: "

};

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    let loadedSections = []; // Store 

    const titleSelect = document.getElementById('titleSelect');
    const output = document.getElementById('output');

    // dropdown
    for (let i = 1; i <= 50; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Title ${i}`;
      titleSelect.appendChild(option);
    }

    async function fetchTitle() {
      const selected = titleSelect.value;
      const url = `https://www.ecfr.gov/api/versioner/v1/structure/current/title-${selected}.json`;
      output.innerText = `Fetching Title ${selected}...`;

      try {
        const res = await axios.get(url);
        const data = res.data;

        const sections = extractSections(data);
        const structured = sections.map(splitPathStructure);

        const summary = `${data.label}\nTotal Sections: ${structured.length}`;
        output.innerText = summary;

        // Push Firebase
        const ref = db.ref(`titles/title-${selected}`);
        await ref.set(structured);

        output.innerText += `\n at titles/title-${selected}`;

      } catch (err) {
        output.innerText = `Error: ${err.message}`;
      }
    }

    // Recursive extractor
    function extractSections(obj, pathStack = []) {
      const results = [];
      const currentLabel = obj.label || obj.label_level || obj.identifier || 'unknown';
      const fullPath = [...pathStack, currentLabel];

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

    //  structure
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

    async function readFromFirebase() {
  
        const selected = titleSelect.value;
        const ref = db.ref(`titles/title-${selected}`);

        output.innerText = `Reading Title ${selected} from Firebase...`;
        sectionList.innerHTML = '';
        showAllBtn.style.display = 'none';

        try {
            const snapshot = await ref.once('value');
            const data = snapshot.val();

            if (!data) {
            output.innerText = `No title-${selected} please Fetch Title Data first`;
            return;
            }

            loadedSections = data;

            output.innerText = `loaded ${data.length} sections from Firebase for Title ${selected}`;

              data.forEach(section => {
            if (section.size > 15000) {  // Check if the size is greater than 500
                alert(`Section ${section.identifier} is too wordy! Over 15,000 words.`);
            }
        });

            const preview = data.slice(0, 10).map(renderSectionHTML).join('<hr>');
            sectionList.innerHTML = preview;
            showAllBtn.style.display = 'inline-block';

        } catch (err) {
            output.innerText = `❌ Error reading from Firebase: ${err.message}`;
        }
}



function showAllSections() {
  const allHtml = loadedSections.map(renderSectionHTML).join('<hr>');
  sectionList.innerHTML = allHtml;
  showAllBtn.style.display = 'none';
}


/*function renderSectionHTML(sec) {
  return `
    <div>
      <strong>${sec.subpart || sec.section || sec.identifier}</strong><br>
      <em>${sec.description}</em><br>
      <code>${sec.identifier}</code> | ${sec.received_on} | Size: ${sec.size}
    </div>
  `;
}
*/

function renderSectionHTML(sec) {
  // Extract pieces safely
  const titleNumber = (sec.title || '').match(/\d+/)?.[0];
  const chapter = sanitizePath(sec.chapter);
  const subchapter = sanitizePath(sec.subchapter);
  const part = sanitizePath(sec.part);
  const subpart = sanitizePath(sec.subpart);
  const sectionId = sec.identifier;

  let sectionURL = '#';

  if (titleNumber && sectionId) {
    //  eCFR path
    sectionURL = `https://www.ecfr.gov/current/title-${titleNumber}`;
    if (chapter) sectionURL += `/chapter-${chapter}`;
    if (subchapter) sectionURL += `/subchapter-${subchapter}`;
    if (part) sectionURL += `/part-${part}`;
    if (subpart) sectionURL += `/subpart-${subpart}`;
    sectionURL += `/section-${sectionId}`;
  }

  return `
    <div>
      <strong>${sec.section || sec.subpart || sectionId}</strong><br>
      <em>${sec.description}</em><br>
      <code>${sectionId}</code> | ${sec.received_on} | Size: ${sec.size}<br>
      <a href="${sectionURL}" target="_blank">
        <button>Read More</button>
      </a>

     
  `;
}

// e "IChapter I..."
function sanitizePath(label) {
  if (!label) return null;
  const match = label.match(/(?:Chapter|Subchapter|Part|Subpart)[\s–-]*(\w+)/i);
  return match ? match[1] : null;
}


async function readMore(path) {
  try {
    const res = await fetch(`https://www.ecfr.gov${path}`);
    const html = await res.text();

     const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articleContent = doc.querySelector('.section')?.innerText || 'No content found.';

    const wordCount = articleContent.trim().split(/\s+/).length;
    console.log(`size Count: ${wordCount}`);

    // Push to 'article'
    const db = firebase.firestore();
    const sectionRef = db.collection("titles").doc("title-1").collection("sections").doc("section-2.2");
    await sectionRef.set({ article: articleContent }, { merge: true });

    console.log(" to Firestore.");
  } catch (err) {
    console.error("fetch/save article:", err.message);
  }
}

// 
function sanitizeSectionId(path) {
  return path.replace(/[.#$[\]]+/g, '_'); // Replace scores
}

// 
async function getWordCountFromFirebase(sectionId) {
    const selected = titleSelect.value; // 
    const sanitizedSectionId = sanitizeSectionId(sectionId); // Sanitize the sectionId
    //const ref = db.ref(`titles/title-${selected}/sections/${sanitizedSectionId}`);
        const ref = db.ref(`titles/title-${selected}/sections/section-${sanitizedSectionId}`)
        console.log(`path: titles/title-${selected}/sections/section-${sanitizedSectionId}`);
    try {
        // Read 
        const snapshot = await ref.once('value');
        const data = snapshot.val();

        if (!data) {
            console.log(`⚠️ No data found for sectionId: ${sectionId} please Fetch Title Data first`);
            return;
        }

        //  'size' 
        const wordCount = data.size || 'N/A';  
        //console.log(` section ${sectionId}: ${wordCount}`);
                console.log(`section ${sanitizedSectionId}: ${wordCount}`);

         document.getElementById(`wordcount-${sanitizedSectionId}`).innerText = `Word Count: ${wordCount}`;

    } catch (err) {
        console.error(`Failed read Firebase: ${err.message}`);
    }
}




async function countSectionsInTitle() {
    const selectedTitle = "2";  // static
    const ref = db.ref(`titles/title-${selectedTitle}`); // 
const refSize = db.ref(`titles/title-${selectedTitle}/0/size`)
    try {
        // F 
        const snapshot = await ref.once('value');
        const data = snapshot.val(); // Get the data from the snapshot

        // 
        if (data) {
            const sectionCount = Object.keys(data).length; // Count the keys (each section)
            console.log(` in title-${selectedTitle}: ${sectionCount}`);
            output.innerText = `Number of sections in title-${selectedTitle}: ${sectionCount}`;
        } else {
            console.log(`no found for title-${selectedTitle} please Fetch Title Data first`);
            output.innerText = `no for title-${selectedTitle}`;
        }

    } catch (err) {
        console.error(`Failed to read : ${err.message}`);
        output.innerText = `error: ${err.message}`;
    }
    
}
document.getElementById("countSections").addEventListener("click", getSizeFromFirebase);

// Trigger the function to count sections


async function getSizeFromFirebase() {
    const selectedTitle = "2"; // static
    const refSize = db.ref(`titles/title-${selectedTitle}/0/size`); // 

    try {
        const snapshot = await refSize.once('value'); // Fetch
        const size = snapshot.val(); // 

        if (size !== null) {
            console.log(`size title-${selectedTitle}: ${size}`);
            output.innerText = `section 0 under title-${selectedTitle}: ${size}`;
        } else {
            console.log(`No size  section 0 under title-${selectedTitle}`);
            output.innerText = `No section 0 under title-${selectedTitle}`;
        }
    } catch (err) {
        console.error(`Failed to db: ${err.message}`);
        output.innerText = `Error reading : ${err.message}`;
    }
   
}

document.getElementById("fetchDataButton").addEventListener("click", getSizeFromFirebase);



async function getUpdateFromFirebase() {
    const selectedTitle = "2"; 
    const refSize = db.ref(`titles/title-${selectedTitle}/0/received_on`); // Reference to size

    try {
        const snapshot = await refSize.once('value'); // Fetch  
        const size = snapshot.val(); // Get the size value

        if (size !== null) {
            console.log(` 0 under title-${selectedTitle}: ${size}`);
            output.innerText = `date section 0 under title-${selectedTitle}: ${size}`;
        } else {
            console.log(` section 0 under title-${selectedTitle}`);
            output.innerText = `No date found for section 0 title-${selectedTitle}`;
        }
    } catch (err) {
        console.error(`failed to read  ${err.message}`);
        output.innerText = `err from db: ${err.message}`;
    }
 getUpdateFromFirebase();
}

 async function generateChecksum(data) {
    const encodedData = new TextEncoder().encode(JSON.stringify(data)); // Convert data to Uint8Array
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData); // Generate hash (ArrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert ArrayBuffer to byte array
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join(''); // Convert to hex string
    return hashHex; 
}

 async function populateDataForDay1() {
    const selectedTitle = "2";  // Title to be 
    const sectionId = "0";      // First section Day 0
    const ref = db.ref(`titles/title-${selectedTitle}/${sectionId}`);

    try {
        // Check if section 
        const snapshot = await ref.once('value');
        const existingData = snapshot.val();

        if (existingData) {
            console.log(`already exists for section ${sectionId} under title-${selectedTitle}`);
                        alert(`already exists for section ${sectionId} under title-${selectedTitle}`);

            return;  
        }

         const size = 500;  // Initial word  samplr
        const received_on = new Date().toISOString();  // Current
        const checksum = await generateChecksum({ size, received_on });  // Generate

        // Data create checksum day 0
        const sectionData = {
            chapter: "Subtitle A—Office of Management and Budget Guidance for Federal Financial Assistance",
            description: "Content of this title.",
            identifier: "1.100",
            part: "Subpart A—Introduction to Title 2 of the CFR",
            received_on,
            size,
            checksum
        };

        sectionData.checksum = checksum;

        await ref.set(sectionData);

        console.log(` section ${sectionId}  title-${selectedTitle} populated`);
    } catch (err) {
        console.error(` data for Day 1: ${err.message}`);
    }
}

//populateDataForDay1();




