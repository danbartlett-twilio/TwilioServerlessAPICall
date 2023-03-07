// node generate-test-file.js csv\json qty
// generate csv or json
// qty is number of messages in file
if (process.argv.length !== 4) {
  console.error('Expect two arguments csv|json qty(number)');
  process.exit(1);
}

// Set output type and number of messages
const type = process.argv[2];
const qty = parseInt(process.argv[3]);
console.log("File Type => ", type);
console.log("Number of Messages => ", qty);

// Create timestamp
const now = Date.now();

// Build filename
const filename = `./${qty}-${now}.${type}`;
console.log("Filename => ", filename);

// Import fs module
import { appendFileSync } from "fs";

// Return a random string for body of message
function returnRandomBody(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

// Return a random string for TO phone numbers
function returnRandomToNumber() {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 4) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return `+1500555${result}`;
}


// Create an array of TO numbers. Start with numbers that will
// throw errors. Add passable numbers below. All numbers use "555" prefix.
let toNumbers = [
    "+15005550001", // Invalid Phone Number
    "+15005550002", // Cannot route to this number.
    "+15005550003", // 	Your account does not have international permissions.
    "+15005550004", // 	The number is in the blocked list
    "+15005550009", // 	The number is not SMS capable.        
];

// Add 50 valid numbers to the TO number array
for (let i = 0; i < 50; i++) {
    toNumbers.push(returnRandomToNumber());
}

// Create an array of FROM numbers. There are more valid FROM numbers
// than invalid numbers.
let fromNumbers = [
    "+15005550006","+15005550006","+15005550006", // Valid Phone Number
    "+15005550006","+15005550006","+15005550006", // Valid Phone Number
    "+15005550006","+15005550006","+15005550006", // Valid Phone Number        
    "+15005550006","+15005550006","+15005550006", // Valid Phone Number
    "+15005550006","+15005550006","+15005550006", // Valid Phone Number
    "+15005550006","+15005550006","+15005550006", // Valid Phone Number
    "+15005550006","+15005550006","+15005550006", // Valid Phone Number
    "+15005550001", // Invalid Phone Number
    "+15005550007", // The number is not owned by your account or not SMS capable.
    "+15005550008", // The number has a full SMS queue.
    "+15005551234", // The number is not owned by your account or not SMS capable.
];

// Used to generate a csv row and append to file.
// Adjust as needed to add addition parameters
/**
 * To, StatusCallback, ProvideFeedback, Attempts, ValidityPeriod, SmartEncoded,
 * ScheduleType, SendAt, SendAsMms, ShortenUrls, ContentSid, ContentVariables,
 * From, MessagingServiceSid, Body, MediaUrl
 * https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource
 */
class CSVMessageRow {
    constructor(to = "", from="", body="") {
        this.To = to;
        this.From = from;
        this.Body = body;
    }
    saveAsCSV(last) {
        let csv = `${this.To},${this.From},${this.Body}`;
        if (!last) { csv += '\n'; } 
        try {
            appendFileSync(filename, csv);
        } catch (err) {
            console.error(err);
        }
    }
}

// Adds header row and then calls CSVMessageRow 
// to fill in all test messages
const generateCSVFile = () => {

    // HEADER LINE
    let h = new CSVMessageRow("To","From","Body");
    h.saveAsCSV()

    for (let i = 0; i < qty; i++) {
        let t = toNumbers[Math.floor(Math.random()*toNumbers.length)];
        let f = fromNumbers[Math.floor(Math.random()*fromNumbers.length)];
        let b = returnRandomBody(25);
        let c = new CSVMessageRow(t,f,b);
        let last = (i === (qty-1)) ? true : false;
        c.saveAsCSV(last);
    }

}

// Used to generate a message object
// Adjust as needed to add addition parameters
/**
 * To, StatusCallback, ProvideFeedback, Attempts, ValidityPeriod, SmartEncoded,
 * ScheduleType, SendAt, SendAsMms, ShortenUrls, ContentSid, ContentVariables,
 * From, MessagingServiceSid, Body, MediaUrl
 * https://www.twilio.com/docs/sms/api/message-resource#create-a-message-resource
 */
class JSONMessageObject {
    constructor(to = "", from="", body="") {
        this.To = to;
        this.From = from;
        this.Body = body;
    }
    saveAsJSON(last) {
        let json = JSON.stringify(this);
        if (!last) { json += ',\n'; } 
        try {
            appendFileSync(filename, json);
        } catch (err) {
            console.error(err);
        }
    }
}

// Calls JSONMessageObject to fill in all test messages
// saves file
const generateJSONFile = () => {

    let jsonObj = {
        messages: []
    };

    for (let i = 0; i < qty; i++) {
        let t = toNumbers[Math.floor(Math.random()*toNumbers.length)];
        let f = fromNumbers[Math.floor(Math.random()*fromNumbers.length)];
        let b = returnRandomBody(25);
        let c = new JSONMessageObject(t,f,b);
        jsonObj.messages.push(c);
    }

    try {
        appendFileSync(filename, JSON.stringify(jsonObj));
    } catch (err) {
        console.error(err);
    }       

}

// Generate file depending on Test type
if (type === 'csv') {
    generateCSVFile();
} else if (type === 'json') {
    generateJSONFile();
}

