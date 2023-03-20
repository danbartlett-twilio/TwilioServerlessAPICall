/**
 *  process-json
 * 
 * Lambda function triggered by createObject (JSON file) event in S3 SOURCE
 * bucket. The JSON file should contain an array of message objects with params
 * needed to call the twilio api. This function reads the file,  
 * calculates the delays and number of files to match configured
 * APICALLSPERSECOND, then saves the file(s) to the HOLDING bucket and lastly
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
async function getJsonMessagesArray(record) {

    let bucket = record.s3.bucket.name;
    let key = record.s3.object.key;

    //console.info("bucket => ",bucket);
    //console.info("key => ",key);
    
    let command = new GetObjectCommand({Bucket: bucket,Key: key});
    
    try {

        let data = await client.send(command);                
        let json = await data.Body.transformToString();        
        let parsed = JSON.parse(json)        
        return parsed.messages
    
    } catch (error) {

        console.log("Error getting JSON from S3! => ", error);

    }

}

// For each row, convert to a json object and
// then send to the SQS queue to send
async function parseAndSaveFileToHoldingBucket( messages, index, filename ) {
        
    //console.log("convertedMessages => ", convertedMessages);
    
    // KEY SETTING ALERT! Math to add a delay to process messages
    // in 15 minute batches below.     
    // Add delay for each line to control throughput
    // Take ceiling (round up) of array index / APICALLSPERSECOND    
    messages = messages.map( (message, index) => ({
        ...message,
        DelaySeconds: Math.ceil( (index+1) / parseInt(process.env.APICALLSPERSECOND) ) 
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

    let messages = await getJsonMessagesArray(event.Records[0]);

    // This is the API Calls Per Second rate set in the yaml template!
    let acps = parseInt(process.env.APICALLSPERSECOND);    

    console.log("messages.length => ", messages.length);    

    let messagesPer15Minutes = acps * 900;

    console.log("messagesPer15Minutes => ", messagesPer15Minutes);    

    let filesNeeded = Math.ceil(messages.length / messagesPer15Minutes);

    console.log("filesNeeded => ", filesNeeded);    

    let fileNames = [];       

    for ( let i = 0; i < filesNeeded; i++ ) {                

        let amountToTake = ( messages.length < messagesPer15Minutes )  ? (messages.length) : (messagesPer15Minutes);                
        let name = await parseAndSaveFileToHoldingBucket( messages.splice( 0, amountToTake ), i, event.Records[0].s3.object.key );
        fileNames.push(name);        

    }

    console.log("filesNames array => ", fileNames);

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
        
        // comment
        //console.log ("response => ", response);
    
    } catch (error) {

        console.log("Error starting step function execution! => ", error);

    }

};