/**
 *  check for error 212610
 *  
 * lambda invoked by event bus if error code matches. 
 */

export const lambdaHandler = async (event, context) => {
    
    // https://www.twilio.com/docs/api/errors/21610
    // Attempt to send to unsubscribed recipient
    console.info("Error Code 21610 => \n" + JSON.stringify(event, null, 2));

};