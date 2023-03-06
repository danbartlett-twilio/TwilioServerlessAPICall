/**
 *  save-to-dynamodb
 * 
 * Lambda function subscribed to SNS Topic. Receives
 * new messages, parses the message body, and then
 * saves to DynamoDB Table. primary key / sort key follows pattern:
 * pk: MessageSid, sk: MessageStatus
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

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

    const client = new DynamoDBClient({ region: process.env.REGION });
    const ddbDocClient = DynamoDBDocumentClient.from(client);               

    let pk;
    let sk;

    if(messageBody.status === 201) {
        pk = messageBody.body.sid;
        sk = messageBody.body.status; 
    } else {
        pk = messageBody.status.toString();
        sk = `${messageBody.body.code}::${messageBody.messageParams.To}::${Date.now()}`;
    }

    // Set primary key as message sid
    // Set sort key as message status
    const newItem = {
        pk: pk,
        sk: sk,
        ...messageBody
    }; 

    // console.log("newItem => ", newItem);
    
    try {
        
        const data = await ddbDocClient.send(
            new PutCommand({
              TableName: process.env.TABLE_NAME,
              Item: newItem,
            })
        );
        //console.log("Successfully saved object to DynamoDB Table! Data => ", data);
        
    } catch (error) {
        
        console.log("Error saving object to Dynamo DB => ", error);

    }    

};