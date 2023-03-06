/**
 *  save-api-response-to-s3
 * 
 * Lambda function subscribed to SNS Topic. Receives
 * new messages, parses the message body, and then
 * saves to S3 bucket. Object key dependings on status
 * of message.
 * 
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Return a random string for body of message
function returnRandomString(length) {
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

export const lambdaHandler = async (event, context) => {
    
    let messageBody = JSON.parse(event.Records[0].Sns.Message);

    //console.info("EVENT\n" + JSON.stringify(event, null, 2));    
    //console.info("Message\n" + JSON.stringify(messageBody, null, 2));

    /*
        SAMPLE SUCCESS CASE
        {
            "status": 201,
            "body": {
                "body": "hello!",
                "num_segments": "1",
                "direction": "outbound-api",
                "from": "+18xxxxxxx",
                "date_updated": "Fri, 17 Feb 2023 02:14:01 +0000",
                "price": null,
                "error_message": null,
                "uri": "/2010-04-01/Accounts/AC7dbxxxxxxx/Messages/SM9c2xxxxxxx.json",
                "account_sid": "AC7dbxxxxxxx",
                "num_media": "0",
                "to": "+19xxxxxxx",
                "date_created": "Fri, 17 Feb 2023 02:14:01 +0000",
                "status": "queued",
                "sid": "SM9c25xxxxxxx",
                "date_sent": null,
                "messaging_service_sid": null,
                "error_code": null,
                "price_unit": "USD",
                "api_version": "2010-04-01",
                "subresource_uris": {
                    "media": "/2010-04-01/Accounts/AC7dbxxxxxxx/Messages/SM9cxxxxxxx/Media.json"
                }
            },
            "messageParams": {
                "To": "+15005559889",
                "From": "+15005550006",
                "Body": "KYNdCg2agH5idou"
            }            
        }
        SAMPLE ERROR CASE
        {
            "status": 400,
            "body": {
                "code": 21211,
                "message": "The 'To' number +19xxxxxxx is not a valid phone number.",
                "more_info": "https://www.twilio.com/docs/errors/21211",
                "status": 400
            },
            "message": {
                "To": "+19xxxxxxx",
                "From": "+18xxxxxxx",
                "Body": "hello!"
            }
        }        

    */


    const client = new S3Client({ region: process.env.REGION });

    let now = new Date(); 
    let y = now.getFullYear().toString();
    let m = (now.getMonth() < 10 ? '0' : '') + now.getMonth().toString();
    let d = (now.getDate() < 10 ? '0' : '') + now.getDate().toString();
    // Create a date prefix so that objects in S3 bucket are organized
    // by date. Note, date is based on UTC time!
    let dateprefix = `${y}-${m}-${d}/`;

    let filename = Date.now().toString();
    if (messageBody.status === 201) {
        filename += "-"+messageBody.body.sid;
    } else {
        if (messageBody.body?.code) {
            filename += "-"+messageBody.body?.code;
        }
        // Add a random string to be sure of unique object keys
        let randomString = returnRandomString(5);
        filename += `-${randomString}`;
    }
    filename += '.json'
        
    let key = `${dateprefix}${messageBody.status.toString()}/${filename}`;

    const params = {
        Bucket: process.env.DestinationBucket,
        Key: key,
        Body: JSON.stringify(messageBody),
        ContentType: 'application/json'        
    };     
    
    const command = new PutObjectCommand(params);
    
    try {
        
        const data = await client.send(command);
        console.log("Successfully saved object to S3 bucket! Data => ", data);

    } catch (error) {
        
        console.log("Error saving object to S3 bucket => ", error);

    }    

};