const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\merko\\.gemini\\antigravity\\brain\\1f357692-e72a-4d13-9e02-6aad832daeef\\.system_generated\\steps\\4071\\content.md', 'utf8');

// Find all matches for @container or similar classes in the stylesheet
const classes = ['@4xl', '@6xl', '4xl', '6xl'];
classes.forEach(c => {
  const index = content.indexOf(c);
  if (index !== -1) {
    console.log(`Found "${c}" at index ${index}:`);
    console.log(content.substring(index - 100, index + 200));
  } else {
    console.log(`"${c}" not found`);
  }
});
