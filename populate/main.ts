import axios from 'axios';
import * as fs from 'fs';

// Define the command-line argument parser
const args = process.argv.slice(2);
let csvFile: string | undefined;
let jsonConfigFile: string | undefined;
let url: string | undefined;

const sanitize = (str: string) => {
  str = str.trim()
  str = str.replace(/\'/g, "").replace(/\"/g, "")
  return str
}

while (args.length > 0) {
  const key = args.shift();
  const value = args.shift();

  switch (key) {
    case '--csv':
      csvFile = value;
      break;
    case '--json':
      jsonConfigFile = value;
      break;
    case '--url':
      url = value;
      break;
    default:
      console.error(`Unknown option: ${key}`);
      process.exit(1);
  }
}

// Check that all required arguments were provided
if (!csvFile || !jsonConfigFile || !url) {
  console.error(`Usage: ${process.argv[1]} --csv <csv_file> --json <json_config_file> --url <url>`);
  process.exit(1);
}

// Check that the CSV file exists and is readable
if (!fs.existsSync(csvFile) || !fs.statSync(csvFile).isFile()) {
  console.error(`Error: CSV file '${csvFile}' does not exist or is not readable.`);
  process.exit(1);
}

// Check that the JSON config file exists and is readable
if (!fs.existsSync(jsonConfigFile) || !fs.statSync(jsonConfigFile).isFile()) {
  console.error(`Error: JSON config file '${jsonConfigFile}' does not exist or is not readable.`);
  process.exit(1);
}

// Read the JSON config file into an array
let config;
try {
  const rawConfig = fs.readFileSync(jsonConfigFile, 'utf8');
  config = JSON.parse(rawConfig);
} catch (e: any) {
  console.error(`Error: Failed to parse JSON config file '${jsonConfigFile}': ${e?.message}`);
  process.exit(1);
}

// Loop through each row in the CSV file
const rawData = fs.readFileSync(csvFile, 'utf8');
const rows = rawData.trim().split('\n');
for (const row of rows) {
  // Split the row into an array
  const data = row.split(',');

  // Construct the POST data based on the JSON config
  let postData: {
    [key: string]: string | number | boolean
  } = {};
  for (const item of config) {
    const csvColumn = item.csvColumn;
    const keyName = item.keyName;
    const dataType = item.dataType;

    const value = data[csvColumn];
    switch (dataType) {
      case 'string':
        postData[keyName] = sanitize(value)
        break;
      case 'number':
        let numValue = parseInt(value)
        if (!numValue) {
          console.error(`Error: Not a number: ${dataType}`);
          process.exit(1);
        }
        postData[keyName] = numValue
        break;
      case 'bool':
        if (!["true", "false"].includes(value)) {
          console.error(`Error: Not a boolean: ${dataType}`);
          process.exit(1);
        }
        postData[keyName] = value === "true" ? true : false
        break;
      default:
        console.error(`Error: Unknown data type: ${dataType}`);
        process.exit(1);
    }
  }
  axios.post(url, postData)
    .then(resp => console.log(resp.data))
    .catch(error => console.error(error))
}

