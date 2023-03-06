/**
 *  send-to-send-queue
 * 
 * Lambda function triggered by createObject (CSV file) event in S3 PROCESS
 * bucket. The file is JSON file is parsed and the arrage of message objects
 * are looped and sent to the SQS queue to be sent to the Twilio API.
 * 
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"; 
const sqsClient = new SQSClient( { region: process.env.REGION });

// This function gets the S3 object, parses the JSON body
async function getLines(record) {

    let bucket = process.env.BUCKET;
    let key = record.s3.object.key;

    //console.info("bucket => ",bucket);
    //console.info("key => ",key);

    let client = new S3Client( { region: process.env.REGION } );
    let command = new GetObjectCommand({Bucket: bucket,Key: key});
    
    try {

        let data = await client.send(command);        
        
        let lines = await data.Body.transformToString();
        
        return JSON.parse(lines);
    
    } catch (error) {

        console.log("Error getting JSON from S3! => ", error);

    }

};

// For each message,send to SQS queue
async function processMessage(message) {
    
    //console.log("In process message => ", message);  

    // Params to add to SQS queue
    // The DelaySeconds is key for rate limiting / metering!
    let params = {
        DelaySeconds: parseInt(message.DelaySeconds),
        MessageBody: JSON.stringify(message),
        QueueUrl: process.env.SQS_QUEUE_URL,
    }    

    let command = new SendMessageCommand(params);
    
    try {
        
        let response = await sqsClient.send(command);
                
        //console.log("Success! response => ", response);

    } catch (error) {

        console.log("Error sending message to SQS queue! => ", error);

    }

}

export const lambdaHandler = async (event, context, callback) => {

    //console.log("event is => ",event);

    let lines = await getLines(event.Records[0]);

    // Loop through all messages and call function to send to SQS
    await Promise.allSettled(lines.messages.map(async (message) => {
        
        await processMessage(message);

    }));      

};