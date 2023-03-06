/**
 *  check-for-errors
 * 
 * Lambda function subscribed to SNS Topic. Receives
 * new messages, parses the message body, looks for error code
 * and if present, format event to send to eventbridge for further 
 * processing. 
 */
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";


export const lambdaHandler = async (event, context) => {
    
    let messageBody = JSON.parse(event.Records[0].Sns.Message);

    console.info("EVENT\n" + JSON.stringify(event, null, 2));    
    console.info("Message\n" + JSON.stringify(messageBody, null, 2));
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

    console.log("messageBody.status => ", messageBody.status);

    if (messageBody.status !== 201) {

        // Pass this onto EventBridge for further processing!
        const client = new EventBridgeClient();
        let eventParams = {
            "Entries": [ 
            {
              // Event envelope fields
              Source: process.env.EVENT_SOURCE_NAME,
              EventBusName: process.env.EVENTBUS_NAME,
              DetailType: process.env.EVENT_DETAIL_TYPE,
              Time: new Date(),
              
              Detail: JSON.stringify({
                ErrorCode: messageBody.body.code.toString(),
                ...messageBody              
              })
            }
            ]    
          };

          console.log("eventParams => ", eventParams);          
        const command = new PutEventsCommand(eventParams);

        try {            
            
            const response = await client.send(command);            
            console.log("Successfully added event to eventbridge! Response => ", response);
        
        } catch (error) {
            
            console.log("Error adding event to eventbridge => ", error);
    
        }    

    } else {

        // No error! Do nothing else!

    }

};