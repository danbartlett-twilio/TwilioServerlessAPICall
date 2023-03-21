/**
 *  send-message
 * 
 * Lambda function polls SQS queue and recieves messages in 
 * batches of 1 or more. For each message
 * call the twilio api and then send the response object to
 * an SNS topic for futher processing
 *
 */

import  querystring from 'node:querystring';
import  { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";

const snsClient = new SNSClient({ region: process.env.REGION });
const sqsClient = new SQSClient({ region: process.env.REGION });

async function publishSNSMessage(twilioResponse) {
       
    let params = {
        Message: JSON.stringify(twilioResponse),            
        TopicArn: process.env.SNStopic
    };
      
    // Send to SNS
    try {
        
        let data = await snsClient.send(new PublishCommand(params));
        //console.log("Success. Message Published",  data);        
        return;

    } catch (err) {
            
        console.log("Error publishing message to Topic!", err.stack);

    }     

}

async function deleteSQSMessage(receiptHandle) {    
    
    let deleteParams = {
        QueueUrl: process.env.SQS_QUEUE_URL,
        ReceiptHandle: receiptHandle
    };
      
    // Delete message from SQS SNS
    try {
        
        let data = await sqsClient.send(new DeleteMessageCommand(deleteParams));
        //console.log("Success. Message Deleted from sqs queue.",  data);        
        return;

    } catch (err) {
            
        console.log("Error deleting message from sqs queue!", err.stack);

    }     

}

async function processMessage(message) {
    
    //console.log("message => ", message);
    
    let m = JSON.parse(message.body);

    // Params of message to send to Twilio
    // This is encoded into body of POST call
    let msg = {
        ...m
    };
    
    // Prepare Twilio response object
    let twilioResponse = { status:null, body:null };    

     // URL to Twilio endpoint. Default is MESSAGING API    
     let url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.ACCOUNT_SID}/Messages.json`;

     let method = 'POST';
     let body = querystring.encode(msg);

     /* POSSIBLE IMPLEMENTATION USING MULTIPLE ENDPOINTS...
     // Pass in an "api" param 
     
     if (m?.api) {
         switch (m.api) {
             case "lookup":
                 url = `https://lookups.twilio.com/v2/PhoneNumbers/${m.To}`;
                 method = 'GET';
                 body = null;
                 break;
             case "studio":
                 url = `https://studio.twilio.com/v2/Flows/${m.Flow}/Executions`;
                 break;  
             case "verify":
                 url = `https://verify.twilio.com/v2/Services/${m.VerifyService}/Verifications`;
                 break;                                 
             default:
                 // Messaging API set as default already
                 break;
 
         }
     }
 
     */
 
     // Crendentials to securely call Twilio API.
     const credentials = Buffer.from(`${process.env.ACCOUNT_KEY}:${process.env.ACCOUNT_SECRET}`).toString('base64');
  
    // Prepare headers for POST call
    let headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization" : `Basic ${credentials}`
    };

    //console.log("url => ", url);
    //console.log("credentials => ", credentials);
    //console.log("headers => ", headers);    

    try {

        // Use native "fetch" to call Twilio
        await fetch(url, { method: method, headers: headers, body: body })        
            .then(function(response) {
                twilioResponse.status = response.status;
                return response.json();

            }).then(function(data) {
                //console.log("in try twilioResponse data => ", data);
                twilioResponse.body = data;
            });

    } catch (error) {

        console.log("Error calling the Twilio API!", error);

    } finally {
        
        // Send SNS message
        if (twilioResponse) {

            // Add the message object for additional context
            twilioResponse.messageParams = msg;

            //console.log("in finally twilioResponse => ", twilioResponse);
            //console.log("in finally twilioResponse.status => ", twilioResponse.status);
            //console.log("in finally twilioResponse.body => ", twilioResponse.body);

            // Send the response to SNS topic for additional processing
            await publishSNSMessage(twilioResponse);
            
            // Explicitly delete message from queue!
            // In case batch size is greater than 1, messages
            // that are processed will be deleted
            await deleteSQSMessage(message.receiptHandle);

            return;

        }    

    }

}

export const lambdaHandler = async (event, context) => {
        
    //console.info("EVENT => \n" + JSON.stringify(event, null, 2));

    // Loop through messages from this SQS batch (will typically be 1)
    // and process!
    await Promise.all(event.Records.map(async (message) => {
        
        await processMessage(message);

    }));      

};