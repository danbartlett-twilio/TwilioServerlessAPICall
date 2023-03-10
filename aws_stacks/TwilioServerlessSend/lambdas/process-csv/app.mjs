/**
 *  process-csv
 * 
 * Lambda function triggered by createObject (CSV file) event in S3 SOURCE
 * bucket. The CSV file contains a header row and then all params
 * needed to call the twilio api. This function reads the file, converts it to an 
 * array, calculates the delays and number of files to match configured
 * CPS, then saves the file(s) to the HOLDING bucket and lastly
 * triggers the STEP FUNCTION to manage the timing of the processing
 * of the files.
 * 
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
let client = new S3Client( { region: process.env.REGION } );

import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn"; 
const sfnClient = new SFNClient({ region: process.env.REGION });

// This function gets the S3 object, reads the body, and splits
// it into an array of "rows"
async function getLines(record) {

    let bucket = record.s3.bucket.name;
    let key = record.s3.object.key;

    //console.info("bucket => ",bucket);
    //console.info("key => ",key);
    
    let command = new GetObjectCommand({Bucket: bucket,Key: key});
    
    try {

        let data = await client.send(command);        
        
        let lines = await data.Body.transformToString();
        
        return lines.split(/\r?\n/);
    
    } catch (error) {

        console.log("Error getting CSV file from S3! => ", error);

    }

}

// Existing function used to parse common CSV row formats.
// Returns an array of strings
async function CSVtoArray(text) {
    var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    // Return NULL if input string is not well formed CSV string.
    if (!re_valid.test(text)) return null;
    var a = [];                     // Initialize array to receive values.
    text.replace(re_value, // "Walk" the string using replace with callback.
        function(m0, m1, m2, m3) {
            // Remove backslash from \' in single quoted values.
            if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
            // Remove backslash from \" in double quoted values.
            else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
            else if (m3 !== undefined) a.push(m3);
            return ''; // Return empty string.
        });
    // Handle special case of empty last value.
    if (/,\s*$/.test(text)) a.push('');
    return a;
}

// convert a csv row into an object by matching headers
// with values for key:value pairs
async function convertToObject( values, headers ) {
    
    let obj = {};

    // Map the headers with each value to create
    // an object
    headers.forEach((e, index) => {
        obj[e] = values[index];
    });   
        
    return obj;
}


// For each row, convert to a json object and
// then send to the SQS queue to send
async function parseAndSaveFileToHoldingBucket( headers, lines, index, filename ) {
    
    let convertedMessages = [];

    for (const line of lines) {        
        // Get an array of string values for the row
        let values = await CSVtoArray(line);        
        let obj = await convertToObject(values, headers);
        convertedMessages.push(obj);
    }
    
    //console.log("convertedMessages => ", convertedMessages);
    
    // KEY SETTING ALERT! Math to add a delay to process messages
    // in 15 minute batches below. 
    // Add delay for each line to control throughput
    // Take ceiling (round up) of array index / CPS
    let messages = convertedMessages.map( (message, index) => ({
        ...message,
        DelaySeconds: Math.ceil( (index+1) / parseInt(process.env.CPS) ) 
    }));

    //console.log("messages => ", messages);
    //console.log("file message count => ", messages.length);

    let key = `${filename}-${index}.json`;

    // Add file to 
    let putObjectParams = {
        Bucket: process.env.HOLDING_BUCKET,
        Key: key,
        Body: JSON.stringify( { messages } ),
        ContentType: 'application/json'
    };
    
    let command = new PutObjectCommand(putObjectParams);    
    
    try {
        
        let response = await client.send(command);
                
        //console.log("Success! response => ", response);

        return key;

    } catch (error) {

        console.log("Error sending message to SQS queue! => ", error);

    }

}

export const lambdaHandler = async (event, context) => {
        
    //console.info("EVENT => \n" + JSON.stringify(event, null, 2));

    let lines = await getLines(event.Records[0]);
    
    //console.log("lines => ", lines);    

    // Parse the header row to be able to create json objects.
    const headers = await CSVtoArray(lines[0]);

    // This the Messages Per Second rate set in the yaml template!
    let cps = parseInt(process.env.CPS);
    
    // Remove the header row!
    lines.shift();
    

    console.log("lines.length => ", lines.length);    

    let messagesPer15Minutes = cps * 900;
    // comment
    console.log("messagesPer15Minutes => ", messagesPer15Minutes);    

    let filesNeeded = Math.ceil(lines.length / messagesPer15Minutes);

    console.log("filesNeeded => ", filesNeeded);    

    let fileNames = [];       

    for ( let i = 0; i < filesNeeded; i++ ) {                

        let amountToTake = ( lines.length < messagesPer15Minutes )  ? (lines.length) : (messagesPer15Minutes);                
        let name = await parseAndSaveFileToHoldingBucket( headers, lines.splice( 0, amountToTake ), i, event.Records[0].s3.object.key );
        fileNames.push(name);        

    }

    //console.log("filesNames array => ", fileNames);

    let stateMachineInput = {
        Payload: {
            FileArray: fileNames,
            FileArrayLength: fileNames.length
        }
    };

    let stepFunctionParams = {
        stateMachineArn: process.env.STATE_MACHINE_ARN,
        input: JSON.stringify(stateMachineInput)
    };

    let command = new StartExecutionCommand(stepFunctionParams);
    
    try {

        let response = await sfnClient.send(command);
        
        //console.log ("response => ", response);
    
    } catch (error) {

        console.log("Error starting step function execution! => ", error);

    }

};