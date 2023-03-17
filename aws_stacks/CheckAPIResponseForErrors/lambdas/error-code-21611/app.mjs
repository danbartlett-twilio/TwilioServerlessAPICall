/**
 *  check for error 212611
 *  
 * lambda invoked by event bus if error code matches. 
 */

export const lambdaHandler = async (event, context) => {
    
    // https://www.twilio.com/docs/api/errors/21611
    // 429 Error Message
    // Queue Full
    console.info("Error Code 21611 => \n" + JSON.stringify(event, null, 2));

};